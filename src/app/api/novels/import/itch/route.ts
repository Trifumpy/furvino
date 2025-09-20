import { NextResponse } from "next/server";
import { ensureClerkId, revalidateTags, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { getUserByExternalId } from "@/app/api/users";
import { createHash } from "crypto";
import { z } from "zod";
import { MAX_GALLERY_ITEMS, MAX_TAGS, MAX_SNIPPET_LENGTH } from "@/contracts/novels";
import { novelTags } from "@/utils";
import sanitizeHtml from "sanitize-html";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ensureCanUploadToGallery, uploadGalleryFile } from "@/app/api/novels/[novelId]/gallery/utils";
import { setNovelThumbnail, validateThumbnail } from "@/app/api/novels/[novelId]/thumbnail/utils";
import { enrichToFullNovel, ensureGetNovel } from "../../utils";

const bodySchema = z.object({
  url: z.string().url(),
  authorId: z.string().optional(),
});

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch Itch page: ${res.status}`);
  return await res.text();
}

type ItchJsonLd = {
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
  let s = t.replace(/\s*-\s*by\s+[^|–—-]+$/i, "");
  s = s.replace(/\s+by\s+[^|–—-]+$/i, "");
  s = s.replace(/[\s|–—-]+$/g, "").trim();
  return s.length > 0 ? s : t;
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
  // Prefer data-lazy_src if present
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
  // Prefer <link rel="author" href="...">
  const linkMatch = html.match(/<link\s+[^>]*rel=["']author["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  if (linkMatch) {
    try { results.add(new URL(linkMatch, baseUrl).toString()); } catch {}
  }
  // Also look for profile link like https://itch.io/profile/<handle>
  const profileMatch = html.match(/href=["'](https?:\/\/itch\.io\/profile\/[A-Za-z0-9_-]+)["']/i)?.[1];
  if (profileMatch) {
    try { results.add(new URL(profileMatch, baseUrl).toString()); } catch {}
  }
  // Always include origin of the game URL (https://<creator>.itch.io/)
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
      // Strip obvious tracking params
      ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","ref","ref_","source"].forEach((p) => u.searchParams.delete(p));
      return u.toString();
    } catch {
      return undefined;
    }
  };

  // Scan anchor hrefs
  // First, prioritize the user_links widget if present
  const widgetMatch = html.match(/<div[^>]*class=["'][^"']*user_links_widget[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
  const anchorSource = widgetMatch || html;
  const aRe = /<a\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRe.exec(anchorSource))) {
    const attrs = m[1];
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const abs = normalize(href);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      const site = classify(u);
      if (!site || site === "itch") continue; // itch stored separately
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

function extractAuthorName(html: string, jsonLd: ItchJsonLd): string | undefined {
  // 1) JSON-LD author
  try {
    const anyJson = jsonLd as unknown as { author?: unknown } | null;
    const a = anyJson?.author;
    if (typeof a === "string" && a.trim()) return a.trim();
    if (a && typeof a === "object") {
      const name = (a as { name?: string }).name;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
  } catch {}

  // 2) Title-like meta: pull text after " by " from og/twitter title
  const meta = parseMetaTags(html);
  const titleCandidates = [meta["og:title"], meta["twitter:title"], extractHtmlTitle(html)].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  for (const t of titleCandidates) {
    const cleaned = t.replace(/["'“”]/g, "").trim();
    const parts = cleaned.split(/\s+by\s+/i);
    if (parts.length >= 2) {
      const author = parts[parts.length - 1]
        .replace(/\s*[|–—-].*$/, "")
        .trim();
      if (author) return author;
    }
  }

  // 3) Visible text fallback: strip tags, then look for "by <name>"
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const m = /\bby\s+([^\n\r|–—-]{1,80})/i.exec(textOnly);
  if (m && m[1]) {
    const candidate = m[1].replace(/["'“”]+/g, "").trim();
    if (candidate) return candidate;
  }
  return undefined;
}

function htmlToRichDoc(html: string): unknown {
  const clean = sanitizeHtml(html, {
    allowedTags: [
      "p","br","strong","em","u","s","a","ul","ol","li","h2","h3","h4","blockquote","code","pre","span"
    ],
    allowedAttributes: { a: ["href","title","target","rel"], span: ["style"], '*': ["style"] },
    transformTags: { 'b': 'strong', 'i': 'em' },
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

  // Only screenshot container anchors
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

function extractTagsFromDom(html: string): string[] {
  const results = new Set<string>();
  // Common Itch tag classes: game_tag, tag, button tag
  const tagLinkRe = /<a\s+[^>]*class=["'][^"']*(?:game_tag|\btag\b)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagLinkRe.exec(html))) {
    const raw = (m[1] || "").replace(/<[^>]*>/g, "");
    const text = raw.replace(/\s+/g, " ").trim();
    if (text) results.add(text);
  }
  // More information > Tags table row
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

function createFileLike(ab: ArrayBuffer, fileName: string, contentType: string): File {
  try {
    // Node >= 20
    return new File([ab], fileName, { type: contentType });
  } catch {
    // Node 18 fallback
    const blob = new Blob([ab], { type: contentType });
    const fileLike = blob as unknown as File;
    try {
      Object.defineProperty(fileLike, "name", { value: fileName, writable: false });
    } catch {}
    return fileLike;
  }
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

export const POST = wrapRoute(async (req) => {
  const { clerkId } = await ensureClerkId();
  const me = await getUserByExternalId(clerkId);
  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { url, authorId: requestedAuthorId } = bodySchema.parse(await req.json());
  const html = await fetchHtml(url);
  const jsonLd = extractJsonLd(html);
  const meta = parseMetaTags(html);
  const title = sanitizeTitle(
    jsonLd?.name || jsonLd?.headline || meta["og:title"] || meta["twitter:title"] || extractHtmlTitle(html)
  ) ?? "Untitled";
  const descHtml = extractDescriptionHtml(html);
  const descriptionRich = descHtml ? htmlToRichDoc(descHtml) : undefined;
  const snippetRaw = sanitizeText(meta["og:description"] || meta["twitter:description"] || undefined);
  const snippet = snippetRaw ? snippetRaw.slice(0, MAX_SNIPPET_LENGTH) : undefined;
  const tags = Array.isArray(jsonLd?.keywords)
    ? (jsonLd?.keywords as unknown[]).map((x) => String(x)).slice(0, 10)
    : (typeof jsonLd?.keywords === 'string'
      ? String(jsonLd?.keywords).split(/[\,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 10)
      : []);
  const domTags = extractTagsFromDom(html).map(decodeHtmlEntities);
  const mergedTags = mapToSiteTags(Array.from(new Set([...(tags || []), ...domTags]))).slice(0, MAX_TAGS);

  // Resolve primary image (thumbnail)
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
  const jsonImage = resolveImage(jsonLd?.image);
  const ogImage = meta["og:image"] || meta["twitter:image"];
  let thumbnailUrl = jsonImage || ogImage || extractPrimaryImageFromDom(html, url);
  try { if (thumbnailUrl) thumbnailUrl = new URL(thumbnailUrl, url).toString(); } catch {}

  // Resolve or create author: prefer explicit authorId if caller is that author or admin
  let authorId: string | undefined = undefined;
  const isAdmin = Array.isArray(me.roles) && me.roles.includes("admin");
  if (requestedAuthorId) {
    if (isAdmin || me.authorId === requestedAuthorId) {
      authorId = requestedAuthorId;
    } else {
      return NextResponse.json({ error: "Forbidden: cannot import for another author" }, { status: 403 });
    }
  }
  if (!authorId) {
    const authorName = extractAuthorName(html, jsonLd) || "Unknown";
    const existingAuthor = await prisma.author.findFirst({ where: { name: authorName } });
    if (existingAuthor) authorId = existingAuthor.id;
    else {
      // If user has an author profile, default to it, else create by name
      if (me.authorId) authorId = me.authorId;
      if (!authorId) {
        const createdAuthor = await prisma.author.create({ data: { name: authorName } });
        authorId = createdAuthor.id;
      }
    }
  }

  // Attempt to fetch creator page and capture their external links
  try {
    const authorProfileUrls = resolveAuthorProfileUrls(html, url);
    for (const authorProfileUrl of authorProfileUrls) {
      const authorHtml = await fetchHtml(authorProfileUrl);
      const authorLinks = extractExternalUrls(authorHtml, authorProfileUrl);
      if (Object.keys(authorLinks).length === 0) continue;
      // Merge with any existing author.externalUrls without overwriting existing keys
      const current = await prisma.author.findUnique({ where: { id: authorId }, select: { externalUrls: true } });
      const currentObj = (current?.externalUrls as Record<string, string> | null | undefined) || {};
      const additions = Object.fromEntries(Object.entries(authorLinks).filter(([k]) => !(k in currentObj)));
      if (Object.keys(additions).length === 0) continue;
      const merged = { ...currentObj, ...additions } as unknown as object;
      await prisma.author.update({ where: { id: authorId }, data: { externalUrls: merged } });
    }
  } catch {}

  // Collect external links from game page and creator profile(s)
  const pageLinks = extractExternalUrls(html, url);
  let profileLinks: Record<string, string> = {};
  try {
    const authorProfileUrls = resolveAuthorProfileUrls(html, url);
    for (const authorProfileUrl of authorProfileUrls) {
      const authorHtml = await fetchHtml(authorProfileUrl);
      const links = extractExternalUrls(authorHtml, authorProfileUrl);
      profileLinks = { ...profileLinks, ...links };
    }
  } catch {}

  // Create novel minimal record
  const created = await prisma.novel.create({
    data: {
      title,
      authorId,
      descriptionRich: descriptionRich as unknown as object | undefined,
      externalUrls: { itch: url, ...pageLinks, ...profileLinks } as unknown as object,
      // thumbnail will be downloaded and set below
      snippet,
      tags: mergedTags,
    },
  });

  // Download and set thumbnail via the same pipeline as manual uploads
  try {
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
        await setNovelThumbnail(created.id, validated);
      }
    }
  } catch {}

  // Try to import gallery: upload up to first 6 unique not-already-present images in order
  try {
    const existing = await prisma.galleryItem.findMany({ where: { novelId: created.id }, select: { imageUrl: true } });
    const existingNames = new Set<string>();
    const addNameVariants = (name: string) => {
      const lower = name.toLowerCase();
      existingNames.add(lower);
      const baseNoExt = lower.replace(/\.[a-z0-9]+$/, "");
      existingNames.add(baseNoExt);
    };
    for (const { imageUrl } of existing) {
      try {
        const u = new URL(imageUrl);
        const f = u.searchParams.get("f");
        if (f) addNameVariants(f);
        const pathName = u.pathname.split("/").pop();
        if (pathName) addNameVariants(pathName);
      } catch {}
    }
    const raw = extractGalleryImageUrls(html, url);
    // Only upload the exact number of screenshots found, don't fill empty slots
    const actualScreenshotsCount = raw.length;
    const remainingSlots = MAX_GALLERY_ITEMS - existing.length;
    const maxToUpload = Math.min(actualScreenshotsCount, remainingSlots);
    const selected: string[] = [];
    const seenKeys = new Set<string>();
    const toKey = (inputUrl: string): string => {
      try {
        const u = new URL(inputUrl, url);
        const normPath = u.pathname.replace(/\/(\d+x\d+)(?:%23c)?\//g, "/");
        const name = (normPath.split("/").pop() || "").toLowerCase();
        return name.replace(/\.[a-z0-9]+$/, "");
      } catch {
        return inputUrl;
      }
    };
    for (const u of raw) {
      const abs = (() => { try { return new URL(u, url).toString(); } catch { return u; } })();
      const key = toKey(abs);
      if (!key) continue;
      if (existingNames.has(key) || seenKeys.has(key)) continue;
      seenKeys.add(key);
      if (selected.length < maxToUpload) selected.push(abs);
      if (selected.length >= maxToUpload) break;
    }
    const seenHashes = new Set<string>();
    for (const imgUrl of selected) {
      try {
        await ensureCanUploadToGallery(created.id);
        const res = await fetch(imgUrl, { headers: { Referer: url, Accept: "image/*;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)" } });
        if (!res.ok) continue;
        const ct = res.headers.get("content-type") || "image/jpeg";
        const ab = await res.arrayBuffer();
        // Deduplicate by content hash within this run
        const hash = createHash("sha1").update(Buffer.from(ab)).digest("hex");
        if (seenHashes.has(hash)) continue;
        const pathname = (() => { try { return new URL(imgUrl).pathname; } catch { return "/img.jpg"; } })();
        const baseName = pathname.split("/").pop() || "image";
        const fileName = (baseName.includes(".") ? baseName : `${baseName}.${ct.split("/")[1] || "jpg"}`).toLowerCase();
        const baseNoExt = fileName.replace(/\.[a-z0-9]+$/, "");
        if (existingNames.has(fileName) || existingNames.has(baseNoExt)) continue;
        const file = createFileLike(ab, fileName, ct);
        await uploadGalleryFile(created.id, file);
        seenHashes.add(hash);
        existingNames.add(fileName);
        existingNames.add(baseNoExt);
      } catch {}
    }
  } catch {}
  // Return enriched record with updated thumbnail URL
  const fresh = await ensureGetNovel(created.id);
  const result = await enrichToFullNovel(fresh);
  revalidateTags(novelTags.novel(created.id));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 201 });
});


