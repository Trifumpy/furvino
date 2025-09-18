import { absoluteUrl } from "@/utils/site";

let hasSubmitted = false;

export function submitSitemapOnce(): void {
  if (hasSubmitted) return;
  if (process.env.NODE_ENV !== "production") return;
  hasSubmitted = true;

  const sitemapUrl = absoluteUrl("/sitemap.xml");
  const targets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];

  // Fire and forget; do not block rendering
  Promise.allSettled(
    targets.map((u) =>
      fetch(u, { method: "GET", redirect: "follow", cache: "no-store" }).catch(() => undefined)
    )
  ).catch(() => undefined);
}


