import { NextResponse } from "next/server";
import { ensureAdmin, revalidateTags, wrapRoute } from "@/app/api/utils";
import { ensureCanUpdateNovel, ensureGetNovel, updateNovelAndEnrich } from "@/app/api/novels/utils";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { MAX_GALLERY_ITEMS, MAX_SNIPPET_LENGTH } from "@/contracts/novels";
import { novelTags } from "@/utils";
import { ensureCanUploadToGallery, uploadGalleryFile } from "../../gallery/utils";
import { setNovelThumbnail, validateThumbnail } from "../../thumbnail/utils";
import { createHash } from "crypto";

const bodySchema = z.object({
  url: z.string().url(),
});

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Itch page: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

type ItchJsonLd = {
  "@type"?: string;
  name?: string;
  headline?: string;
  description?: string;
  about?: string;
  image?: string | { url?: string } | Array<string | { url?: string }>;
  keywords?: string[] | string;
} | null;

function decodeHtmlEntities(input: string): string {
  if (!input) return input;
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _m; }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _m; }
    });
}

function extractJsonLd(html: string): ItchJsonLd {
  const match = html.match(/<script[^>]*type=["']application\/(ld\+json)["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const json = JSON.parse(match[2].trim());
    if (Array.isArray(json)) return (json.find((x) => x && x["@type"]) as ItchJsonLd) ?? null;
    return (json as ItchJsonLd) ?? null;
  } catch {
    return null;
  }
}

function sanitizeText(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  const decoded = decodeHtmlEntities(text);
  return decoded.replace(/\s+/g, " ").trim();
}

function sanitizeTitle(raw: string | undefined | null): string | undefined {
  const t = sanitizeText(raw);
  if (!t) return t;
  // Remove suffix like " by Author" or " - by Author"
  let s = t.replace(/\s*-\s*by\s+[^|–—-]+$/i, "");
  s = s.replace(/\s+by\s+[^|–—-]+$/i, "");
  // Trim stray separators at end
  s = s.replace(/[\s|–—-]+$/g, "").trim();
  return s.length > 0 ? s : t;
}

function toRichTextDoc(plain: string | undefined): unknown | undefined {
  if (!plain) return undefined;
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: plain }],
      },
    ],
  } as unknown;
}

function parseMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const metaRegex = /<meta\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(html))) {
    const tag = m[1];
    const nameMatch = tag.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (nameMatch && contentMatch) {
      result[nameMatch[1]] = contentMatch[1];
    }
  }
  return result;
}

function extractPrimaryImageFromDom(html: string, baseUrl: string): string | undefined {
  const imgRe = /<img\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const attrs = m[1];
    const lazy = attrs.match(/data-lazy_src=["']([^"']+)["']/i)?.[1];
    const srcset = attrs.match(/srcset=["']([^"']+)["']/i)?.[1];
    const src = attrs.match(/src=["']([^"']+)["']/i)?.[1];
    let candidate: string | undefined;
    if (srcset) {
      const entries = srcset.split(",").map((p) => p.trim()).filter(Boolean);
      if (entries.length) candidate = entries[entries.length - 1].split(/\s+/)[0];
    }
    candidate = candidate || lazy || src;
    if (!candidate) continue;
    try {
      const u = new URL(candidate, baseUrl).toString();
      if (/img\.(itch|ugc)\.zone/i.test(u) || /\.(png|jpe?g|webp)(\?.*)?$/i.test(u)) return u;
    } catch {}
  }
  return undefined;
}

function extractHtmlTitle(html: string): string | undefined {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (m && m[1]) return sanitizeText(m[1]);
  return undefined;
}

function resolveAuthorProfileUrls(html: string, baseUrl: string): string[] {
  const results = new Set<string>();
  const linkMatch = html.match(/<link\s+[^>]*rel=["']author["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  if (linkMatch) {
    try { results.add(new URL(linkMatch, baseUrl).toString()); } catch {}
  }
  const profileMatch = html.match(/href=["'](https?:\/\/itch\.io\/profile\/[A-Za-z0-9_-]+)["']/i)?.[1];
  if (profileMatch) {
    try { results.add(new URL(profileMatch, baseUrl).toString()); } catch {}
  }
  try {
    const u = new URL(baseUrl);
    results.add(`${u.origin}/`);
  } catch {}
  return Array.from(results);
}

function extractExternalUrls(html: string, baseUrl: string): Record<string, string> {
  const found: Record<string, string> = {};
  const setIfEmpty = (key: string, value: string) => {
    if (!found[key]) found[key] = value;
  };
  const classify = (u: URL): string | undefined => {
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "discord.com" || host === "discordapp.com" || host.endsWith("discord.gg")) return "discord";
    if (host === "patreon.com") return "patreon";
    if (host === "x.com" || host === "twitter.com") return "x";
    if (host === "bsky.app" || host.endsWith(".bsky.app")) return "bluesky";
    if (host === "linktr.ee") return "linktree";
    if (host === "carrd.co" || host.endsWith(".carrd.co")) return "carrd";
    if (host === "furaffinity.net") return "furaffinity";
    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    if (host === "t.me" || host === "telegram.me" || host === "telegram.org") return "telegram";
    if (host === "itch.io") return "itch";
    return undefined;
  };
  const normalize = (raw: string): string | undefined => {
    try {
      const u = new URL(raw, baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
      ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","ref","ref_","source"].forEach((p) => u.searchParams.delete(p));
      return u.toString();
    } catch {
      return undefined;
    }
  };

  const aRe = /<a\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRe.exec(html))) {
    const attrs = m[1];
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const abs = normalize(href);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      const site = classify(u);
      if (!site || site === "itch") continue;
      setIfEmpty(site, abs);
    } catch {}
  }

  return found;
}

function extractDescriptionHtml(html: string): string | null {
  const candidates = [
    /<div[^>]*class=["'][^"']*formatted_description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["']game_description["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*user_formatted[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const re of candidates) {
    const m = re.exec(html);
    if (m && m[1]) return m[1];
  }
  return null;
}

function htmlToRichDoc(html: string): unknown {
  const clean = sanitizeHtml(html, {
    allowedTags: [
      "p","br","strong","em","u","s","a","ul","ol","li","h2","h3","h4","blockquote","code","pre","span"
    ],
    allowedAttributes: { a: ["href","title","target","rel"], span: ["style"], '*': ["style"] },
    transformTags: {
      'b': 'strong',
      'i': 'em',
    },
  });
  return generateJSON(clean, [
    StarterKit.configure({ heading: { levels: [2,3,4] } }),
    Link.configure({ openOnClick: false, autolink: true, protocols: ["http","https"] }),
  ]);
}

function extractGalleryImageUrls(html: string, baseUrl: string): string[] {
  // Map normalized URLs to their highest resolution version
  const imageGroups = new Map<string, { url: string; size: number }>();
  
  const normalizeImageUrl = (url: string): string => {
    try {
      const u = new URL(url);
      // Remove ALL size/quality variations to identify the same base image
      const normalized = u.pathname
        .replace(/\/(\d+x\d+)(?:%23c)?\//g, "/") // Remove size folders like /315x250/
        .replace(/\/(small|medium|large|thumb|original|preview|full)\//gi, "/") // Remove ALL quality indicators
        .replace(/\.(png|jpg|jpeg|webp)$/i, "") // Remove extension to catch same image in different formats
        .toLowerCase();
      
      // For itch.zone URLs, extract the base64 image ID
      const itchMatch = normalized.match(/\/([a-zA-Z0-9+\/=]+)\//);
      if (itchMatch && u.hostname.includes('itch')) {
        // Use just the base64 ID as the normalized form
        return itchMatch[1].toLowerCase();
      }
      
      return normalized;
    } catch {
      return url.toLowerCase();
    }
  };
  
  const extractImageSize = (url: string): number => {
    try {
      // Highest priority: original images
      if (/\/original\//i.test(url)) return 10000000;
      
      // Try to extract size from URL patterns like /315x250/ or filename
      const sizeMatch = url.match(/\/(\d+)x(\d+)/);
      if (sizeMatch) {
        return parseInt(sizeMatch[1]) * parseInt(sizeMatch[2]);
      }
      
      // Check for size indicators in the URL
      if (/\/(large|xlarge|full|hd|high)[\/.]/i.test(url)) return 1000000;
      if (/\/(medium|med|regular)[\/.]/i.test(url)) return 500000;
      if (/\/(small|thumb|thumbnail|preview)[\/.]/i.test(url)) return 100000;
      
      // Default medium priority for unknown sizes
      return 750000;
    } catch {
      return 500000;
    }
  };
  
  const isLikelyScreenshot = (absoluteUrl: string, isFromScreenshotSource: boolean = false): boolean => {
    const lower = absoluteUrl.toLowerCase();
    const name = (() => {
      try {
        const u = new URL(lower);
        return (u.pathname.split("/").pop() || "").split("?")[0];
      } catch {
        return lower.split("/").pop() || lower;
      }
    })();
    if (!name) return isFromScreenshotSource; // Only accept if from screenshot source
    
    // Always exclude these
    if (/(icon|logo|title|thumbnail|thumb|avatar|profile)/i.test(name)) return false;
    
    // If not from a screenshot source, also exclude banners/headers/covers
    if (!isFromScreenshotSource && /(banner|header|cover|hero|capsule|feature)/i.test(name)) return false;
    
    return true;
  };
  
  const addUrl = (url: string, isFromScreenshotSource: boolean = false) => {
    if (!url) return;
    try {
      const absolute = new URL(url, baseUrl).toString();
      if (!isLikelyScreenshot(absolute, isFromScreenshotSource)) return;
      
      const normalized = normalizeImageUrl(absolute);
      const size = extractImageSize(absolute);
      
      const existing = imageGroups.get(normalized);
      if (!existing || size > existing.size) {
        imageGroups.set(normalized, { url: absolute, size });
      }
    } catch {}
  };

  // <img class="screenshot"> or <img class="lb_screenshot"> anywhere on the page
  const imgRe = /<img\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const attrs = m[1];
    const hasScreenshotClass = /class=["'][^"']*\b(screenshot|lb_screenshot)\b[^"']*["']/i.test(attrs);
    if (!hasScreenshotClass) continue;
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const dataSrcMatch = attrs.match(/data-src=["']([^"']+)["']/i);
    const srcsetMatch = attrs.match(/srcset=["']([^"']+)["']/i);
    if (srcsetMatch) {
      const entries = srcsetMatch[1].split(",").map((p) => p.trim()).filter(Boolean);
      if (entries.length > 0) {
        const last = entries[entries.length - 1];
        const bestUrl = last.split(/\s+/)[0];
        if (bestUrl) addUrl(bestUrl, true); // true = from screenshot source
      }
    }
    if (dataSrcMatch) addUrl(dataSrcMatch[1], true);
    if (srcMatch) addUrl(srcMatch[1], true);
  }

  // Anchors within screenshot containers only
  const shotListRe = /<div[^>]*class=["'][^"']*(?:screenshot|screenshots|screenshot_list)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let s: RegExpExecArray | null;
  while ((s = shotListRe.exec(html))) {
    const block = s[1];
    const blockAnchorRe = /<a\s+([^>]*?)>/gi;
    let a: RegExpExecArray | null;
    while ((a = blockAnchorRe.exec(block))) {
      const attrs = a[1];
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
      const dataImageMatch = attrs.match(/data-image=["']([^"']+)["']/i);
      if (dataImageMatch) addUrl(dataImageMatch[1], true); // true = from screenshot source
      if (hrefMatch && /\.(png|jpe?g|webp)(\?.*)?$/i.test(hrefMatch[1])) addUrl(hrefMatch[1], true);
    }
  }

  // Don't include CSS background-images or extras as they're not true screenshots
  // Only include images explicitly marked as screenshots
  
  // Return only the highest resolution version of each image, sorted by size (highest first)
  return Array.from(imageGroups.values())
    .sort((a, b) => b.size - a.size)
    .map(item => item.url);
}

function createFileLike(ab: ArrayBuffer, fileName: string, contentType: string): File {
  try {
    return new File([ab], fileName, { type: contentType });
  } catch {
    const blob = new Blob([ab], { type: contentType });
    const fileLike = blob as unknown as File;
    try {
      Object.defineProperty(fileLike, "name", { value: fileName, writable: false });
    } catch {}
    return fileLike;
  }
}

function extractTagsFromDom(html: string): string[] {
  const results = new Set<string>();
  const tagLinkRe = /<a\s+[^>]*class=["'][^"']*(?:game_tag|\btag\b)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagLinkRe.exec(html))) {
    const raw = (m[1] || "").replace(/<[^>]*>/g, "");
    const text = raw.replace(/\s+/g, " ").trim();
    if (text) results.add(text);
  }
  const infoPanel = /<div[^>]*id=["']more-information["'][^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1];
  const source = infoPanel || html;
  const rowMatch = /<tr[^>]*>\s*<td[^>]*>\s*Tags\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/i.exec(source);
  if (rowMatch) {
    const cell = rowMatch[1];
    const aRe2 = /<a\s+[^>]*>([\s\S]*?)<\/a>/gi;
    let am: RegExpExecArray | null;
    while ((am = aRe2.exec(cell))) {
      const raw = (am[1] || "").replace(/<[^>]*>/g, "");
      const text = raw.replace(/\s+/g, " ").trim();
      if (text) results.add(text);
    }
  }
  return Array.from(results);
}

function mapToSiteTags(rawTags: string[]): string[] {
  const normalized = rawTags.map((t) => t.trim().toLowerCase());
  const mapped = normalized.map((t) => {
    if (t === "lgbt" || t === "lgbtq" || t === "lgbtq+" || t === "lgbt+") return "lgbt";
    if (t === "lgbtqia" || t === "lgbtqia+") return "lgbt";
    if (t === "sci-fi" || t === "scifi" || t === "science fiction") return "sci-fi";
    if (t === "slice of life") return "slice of life";
    if (t === "story rich" || t === "story-rich") return "story rich";
    if (t === "dating sim" || t === "dating-sim") return "dating sim";
    return t;
  });
  const seen = new Set<string>();
  return mapped
    .filter((t) => t !== "furry")
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
}

export const POST = wrapRoute(async (request, { params }) => {
  await ensureAdmin();
  const { novelId } = (await params) as { novelId: string };
  const body = await request.json();
  const { url } = bodySchema.parse(body);

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const html = await fetchHtml(url);

  const jsonLd = extractJsonLd(html);
  const meta = parseMetaTags(html);

  const title = sanitizeTitle(
    (jsonLd && (jsonLd.name || jsonLd.headline)) || meta["og:title"] || meta["twitter:title"] || extractHtmlTitle(html)
  );
  const description = sanitizeText(
    (jsonLd && (jsonLd.description || jsonLd.about)) || meta["og:description"] || meta["twitter:description"]
  );
  const snippet = description ? description.slice(0, MAX_SNIPPET_LENGTH) : undefined;
  const descHtml = extractDescriptionHtml(html);
  const resolveImage = (img: unknown): string | undefined => {
    if (!img) return undefined;
    if (typeof img === "string") return img;
    if (Array.isArray(img)) return resolveImage(img[0]);
    if (typeof img === "object" && img !== null) {
      const maybe = (img as { url?: string }).url;
      if (typeof maybe === "string") return maybe;
    }
    return undefined;
  };
  const image = (jsonLd && resolveImage((jsonLd as unknown as { image?: unknown }).image)) || meta["og:image"] || meta["twitter:image"] || extractPrimaryImageFromDom(html, url);

  // Tags: from JSON-LD and DOM
  let tags: string[] | undefined = undefined;
  if (jsonLd && Array.isArray(jsonLd.keywords)) {
    tags = jsonLd.keywords.map((x: unknown) => String(x)).slice(0, 10);
  } else if (jsonLd && typeof jsonLd.keywords === "string") {
    tags = String(jsonLd.keywords)
      .split(/[\,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  const domTags = extractTagsFromDom(html).map(decodeHtmlEntities);
  const mergedTags = mapToSiteTags(Array.from(new Set([...(tags || []), ...domTags])));

  // Attempt to extract banner from page hero if present
  const bannerMatch = html.match(/class=["'][^"']*game_header_image[^"']*["'][^>]*src=["']([^"']+)["']/i);
  const bannerUrl = bannerMatch ? bannerMatch[1] : undefined;

  const existingExternal: Record<string, string> = (() => {
    try {
      const raw = (novel as unknown as { externalUrls?: unknown }).externalUrls;
      if (raw && typeof raw === "object") {
        return Object.fromEntries(
          Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        );
      }
    } catch {}
    return {};
  })();

  // Collect links from this game page and the author profile(s)
  const pageLinks = extractExternalUrls(html, url);
  let profileLinks: Record<string, string> = {};
  try {
    const profileUrls = resolveAuthorProfileUrls(html, url);
    for (const pUrl of profileUrls) {
      const aHtml = await fetchHtml(pUrl);
      const links = extractExternalUrls(aHtml, pUrl);
      profileLinks = { ...profileLinks, ...links };
    }
  } catch {}

  // Merge into novel.externalUrls without overwriting existing keys
  const additions = Object.fromEntries(
    Object.entries({ ...pageLinks, ...profileLinks }).filter(([k]) => !(k in existingExternal))
  );

  const patched = {
    title: title ?? novel.title,
    descriptionRich: descHtml ? htmlToRichDoc(descHtml) : toRichTextDoc(description) ?? (novel as unknown as { descriptionRich?: unknown }).descriptionRich,
    snippet: snippet ?? (novel as unknown as { snippet?: string | null }).snippet ?? undefined,
    thumbnailUrl: typeof image === "string" ? image : (novel as unknown as { thumbnailUrl?: string | null }).thumbnailUrl ?? undefined,
    bannerUrl: bannerUrl ?? (novel as unknown as { bannerUrl?: string | null }).bannerUrl ?? undefined,
    externalUrls: {
      ...existingExternal,
      itch: url,
      ...additions,
    },
    tags: mergedTags.length ? mergedTags : ((novel as unknown as { tags?: string[] }).tags ?? []),
  };

  await updateNovelAndEnrich(novelId, patched);

  // Download and set thumbnail via same pipeline
  try {
    const thumbnailUrl = image;
    if (thumbnailUrl) {
      const res = await fetch(thumbnailUrl, { headers: { Referer: url, Accept: "image/*;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)" } });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "image/jpeg";
        const ab = await res.arrayBuffer();
        const pathname = (() => { try { return new URL(thumbnailUrl as string).pathname; } catch { return "/thumbnail.jpg"; } })();
        const baseName = pathname.split("/").pop() || "thumbnail";
        const fileName = baseName.includes(".") ? baseName : `thumbnail.${ct.split("/")[1] || "jpg"}`;
        const file = createFileLike(ab, fileName, ct);
        const validated = validateThumbnail(file);
        await setNovelThumbnail(novelId, validated);
      }
    }
  } catch {}

  // Gallery import (best-effort): upload up to first 6 unique not-already-present screenshots
  try {
    const full = await ensureCanUploadToGallery(novelId);
    const existingFileNames = new Set<string>();
    const addNameVariants = (name: string) => {
      const lower = name.toLowerCase();
      existingFileNames.add(lower);
      const baseNoExt = lower.replace(/\.[a-z0-9]+$/, "");
      existingFileNames.add(baseNoExt);
    };
    for (const gi of full.galleryItems) {
      try {
        const u = new URL(gi.imageUrl);
        const f = u.searchParams.get("f");
        if (f) addNameVariants(f);
        const pathName = u.pathname.split("/").pop();
        if (pathName) addNameVariants(pathName);
      } catch {}
    }
    const raw = extractGalleryImageUrls(html, url);
    // Only upload the exact number of screenshots found, don't fill empty slots
    const actualScreenshotsCount = raw.length;
    const remainingSlots = MAX_GALLERY_ITEMS - full.galleryItems.length;
    const slotsRemaining = Math.min(actualScreenshotsCount, remainingSlots);
    if (slotsRemaining > 0) {
      const selected: string[] = [];
      const seenKeys = new Set<string>();
      const toKey = (inputUrl: string): string => {
        try {
          const u = new URL(inputUrl, url);
          // Normalize path by removing size folders like /315x250%23c/
          const normPath = u.pathname.replace(/\/(\d+x\d+)(?:%23c)?\//g, "/");
          const name = (normPath.split("/").pop() || "").toLowerCase();
          return name.replace(/\.[a-z0-9]+$/, "");
        } catch {
          return inputUrl;
        }
      };
      for (const r of raw) {
        const abs = (() => { try { return new URL(r, url).toString(); } catch { return r; } })();
        const key = toKey(abs);
        if (!key) continue;
        if (existingFileNames.has(key) || seenKeys.has(key)) continue;
        seenKeys.add(key);
        if (selected.length < slotsRemaining) selected.push(abs);
        if (selected.length >= slotsRemaining) break;
      }
      const seenHashes = new Set<string>();
      for (const imgUrl of selected) {
        try {
          const res = await fetch(imgUrl, { headers: { Referer: url, "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)" } });
          if (!res.ok) continue;
          const ct = res.headers.get("content-type") || "image/jpeg";
          const ab = await res.arrayBuffer();
          const hash = createHash("sha1").update(Buffer.from(ab)).digest("hex");
          if (seenHashes.has(hash)) continue;
          const pathname = (() => { try { return new URL(imgUrl).pathname; } catch { return "/img.jpg"; } })();
          const baseName = pathname.split("/").pop() || "image";
          const fileName = (baseName.includes(".") ? baseName : `${baseName}.${ct.split("/")[1] || "jpg"}`).toLowerCase();
          const baseNoExt = fileName.replace(/\.[a-z0-9]+$/, "");
          if (existingFileNames.has(fileName) || existingFileNames.has(baseNoExt)) continue; // skip already uploaded
          const file = createFileLike(ab, fileName, ct);
          await uploadGalleryFile(novelId, file);
          existingFileNames.add(fileName);
          existingFileNames.add(baseNoExt);
          seenHashes.add(hash);
        } catch {}
      }
    }
  } catch {
    // ignore gallery failures
  }

  // Fetch author profile(s) and merge their external links into Author.externalUrls
  try {
    const authorProfileUrls = resolveAuthorProfileUrls(html, url);
    for (const authorProfileUrl of authorProfileUrls) {
      const authorHtml = await fetchHtml(authorProfileUrl);
      const authorLinks = extractExternalUrls(authorHtml, authorProfileUrl);
      if (Object.keys(authorLinks).length === 0) continue;
      const fresh = await ensureGetNovel(novelId);
      const current = (fresh as unknown as { author: { id: string } }).author.id;
      const db = (await import("@/utils/db")).default;
      const existing = await db.author.findUnique({ where: { id: current }, select: { externalUrls: true } });
      const currentObj = (existing?.externalUrls as Record<string, string> | null | undefined) || {};
      const additions = Object.fromEntries(Object.entries(authorLinks).filter(([k]) => !(k in currentObj)));
      if (Object.keys(additions).length === 0) continue;
      const merged = { ...currentObj, ...additions } as unknown as object;
      await db.author.update({ where: { id: current }, data: { externalUrls: merged } });
    }
  } catch {}

  const result = await ensureGetNovel(novelId).then((n) => updateNovelAndEnrich(n.id, {}));
  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});




