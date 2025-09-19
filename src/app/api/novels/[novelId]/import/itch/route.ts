import { NextResponse } from "next/server";
import { revalidateTags, wrapRoute } from "@/app/api/utils";
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
  return text.replace(/\s+/g, " ").trim();
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

function extractGalleryImageUrls(html: string, baseUrl: string, extra: string[] = []): string[] {
  const urls = new Set<string>();
  const imgRe = /<img\s+([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const attrs = m[1];
    const hasScreenshotClass = /class=["'][^"']*\bscreenshot\b[^"']*["']/i.test(attrs);
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const dataSrcMatch = attrs.match(/data-src=["']([^"']+)["']/i);
    const srcsetMatch = attrs.match(/srcset=["']([^"']+)["']/i);
    const candidates: string[] = [];
    if (srcsetMatch) {
      const entries = srcsetMatch[1].split(",").map((p) => p.trim()).filter(Boolean);
      if (entries.length > 0) {
        const last = entries[entries.length - 1];
        const bestUrl = last.split(/\s+/)[0];
        if (bestUrl) candidates.push(bestUrl);
      }
    }
    if (srcMatch) candidates.push(srcMatch[1]);
    if (dataSrcMatch) candidates.push(dataSrcMatch[1]);
    for (const c of candidates) {
      try {
        const u = new URL(c, baseUrl).toString();
        const looksLikeCdn = /img\.(itch|ugc)\.zone/i.test(u) || /\/(\d+x\d+)\//.test(u);
        if (looksLikeCdn && (hasScreenshotClass || /\.(png|jpe?g|webp)(\?.*)?$/i.test(u))) {
          urls.add(u);
        }
      } catch {}
    }
  }
  const aRe = /<a\s+([^>]*?)>/gi;
  while ((m = aRe.exec(html))) {
    const attrs = m[1];
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    const dataImageMatch = attrs.match(/data-image=["']([^"']+)["']/i);
    const candidates: string[] = [];
    if (hrefMatch) candidates.push(hrefMatch[1]);
    if (dataImageMatch) candidates.push(dataImageMatch[1]);
    for (const c of candidates) {
      try {
        const u = new URL(c, baseUrl).toString();
        if (/img\.(itch|ugc)\.zone/i.test(u) || /\.(png|jpe?g|webp)(\?.*)?$/i.test(u)) urls.add(u);
      } catch {}
    }
  }
  const styleRe = /background-image\s*:\s*url\(([^\)]+)\)/gi;
  while ((m = styleRe.exec(html))) {
    const raw = m[1].replace(/^['\"]|['\"]$/g, "");
    try {
      const u = new URL(raw, baseUrl).toString();
      if (/img\.(itch|ugc)\.zone/i.test(u) || /\.(png|jpe?g|webp)(\?.*)?$/i.test(u)) urls.add(u);
    } catch {}
  }
  for (const e of extra) {
    try {
      const u = new URL(e, baseUrl).toString();
      urls.add(u);
    } catch {}
  }
  return Array.from(urls);
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
  const domTags = extractTagsFromDom(html);
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

  const patched = {
    title: title ?? novel.title,
    descriptionRich: descHtml ? htmlToRichDoc(descHtml) : toRichTextDoc(description) ?? (novel as unknown as { descriptionRich?: unknown }).descriptionRich,
    snippet: snippet ?? (novel as unknown as { snippet?: string | null }).snippet ?? undefined,
    thumbnailUrl: typeof image === "string" ? image : (novel as unknown as { thumbnailUrl?: string | null }).thumbnailUrl ?? undefined,
    bannerUrl: bannerUrl ?? (novel as unknown as { bannerUrl?: string | null }).bannerUrl ?? undefined,
    externalUrls: {
      ...existingExternal,
      itch: url,
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

  // Gallery import (best-effort): download a few screenshots and add to gallery
  try {
    const full = await ensureCanUploadToGallery(novelId);
    const remaining = Math.max(0, MAX_GALLERY_ITEMS - full.galleryItems.length);
    if (remaining > 0) {
      const images = extractGalleryImageUrls(html, url, [image || ""]).slice(0, remaining);
      for (const imgUrl of images) {
        try {
          const res = await fetch(imgUrl, { headers: { Referer: url, "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)" } });
          if (!res.ok) continue;
          const ct = res.headers.get("content-type") || "image/jpeg";
          const ab = await res.arrayBuffer();
          const pathname = (() => { try { return new URL(imgUrl).pathname; } catch { return "/img.jpg"; } })();
          const baseName = pathname.split("/").pop() || "image";
          const fileName = baseName.includes(".") ? baseName : `${baseName}.${ct.split("/")[1] || "jpg"}`;
          const file = createFileLike(ab, fileName, ct);
          await uploadGalleryFile(novelId, file);
        } catch {}
      }
    }
  } catch {
    // ignore gallery failures
  }

  const result = await ensureGetNovel(novelId).then((n) => updateNovelAndEnrich(n.id, {}));
  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});


