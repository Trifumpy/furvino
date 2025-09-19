import { NextResponse } from "next/server";
import { revalidateTags, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { ensureClerkId } from "@/app/api/utils";
import { getUserByExternalId } from "@/app/api/users";
import { ForbiddenError } from "@/app/api/errors";
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
    transformTags: { 'b': 'strong', 'i': 'em' },
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
  // Also catch <a ... data-image|href> pointing to images (used by Itch galleries)
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
  // background-image styles
  const styleRe = /background-image\s*:\s*url\(([^\)]+)\)/gi;
  while ((m = styleRe.exec(html))) {
    const raw = m[1].replace(/^["']|["']$/g, "");
    try {
      const u = new URL(raw, baseUrl).toString();
      if (/img\.(itch|ugc)\.zone/i.test(u) || /\.(png|jpe?g|webp)(\?.*)?$/i.test(u)) urls.add(u);
    } catch {}
  }
  // Screenshot list container anchors
  const shotListRe = /<div[^>]*class=["'][^"']*(?:screenshot|screenshots|screenshot_list)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let s: RegExpExecArray | null;
  while ((s = shotListRe.exec(html))) {
    const block = s[1];
    const blockAnchorRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let a: RegExpExecArray | null;
    while ((a = blockAnchorRe.exec(block))) {
      try {
        const u = new URL(a[1], baseUrl).toString();
        if (/img\.(itch|ugc)\.zone/i.test(u) || /\.(png|jpe?g|webp)(\?.*)?$/i.test(u)) urls.add(u);
      } catch {}
    }
  }
  // Add any extra candidates provided by caller (e.g., og:image)
  for (const e of extra) {
    try {
      const u = new URL(e, baseUrl).toString();
      urls.add(u);
    } catch {}
  }
  return Array.from(urls);
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

export const POST = wrapRoute(async (req, _ctx) => {
  const { clerkId } = await ensureClerkId();
  const me = await getUserByExternalId(clerkId);
  if (!me?.authorId) throw new ForbiddenError("Only authors can import and create novels");

  const { url } = bodySchema.parse(await req.json());
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
  const domTags = extractTagsFromDom(html);
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

  // Create novel minimal record
  const created = await prisma.novel.create({
    data: {
      title,
      authorId: me.authorId,
      descriptionRich: descriptionRich as unknown as object | undefined,
      externalUrls: { itch: url } as unknown as object,
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

  // Try to import gallery
  try {
    const remaining = MAX_GALLERY_ITEMS;
    const images = extractGalleryImageUrls(html, url, [thumbnailUrl || ""]).slice(0, remaining);
    for (const imgUrl of images) {
      try {
        await ensureCanUploadToGallery(created.id);
        const res = await fetch(imgUrl, { headers: { Referer: url, Accept: "image/*;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)" } });
        if (!res.ok) continue;
        const ct = res.headers.get("content-type") || "image/jpeg";
        const ab = await res.arrayBuffer();
        const pathname = (() => { try { return new URL(imgUrl).pathname; } catch { return "/img.jpg"; } })();
        const baseName = pathname.split("/").pop() || "image";
        const fileName = baseName.includes(".") ? baseName : `${baseName}.${ct.split("/")[1] || "jpg"}`;
        const file = createFileLike(ab, fileName, ct);
        await uploadGalleryFile(created.id, file);
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


