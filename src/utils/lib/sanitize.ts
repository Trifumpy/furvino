export type AllowedHtml = string;

// Placeholder allowlist-based sanitizer. In production, prefer sanitize-html.
export function sanitizeHtmlAllowlist(html: string): AllowedHtml {
  // Remove script/style and event handlers
  let sanitized = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Disallow javascript: urls
  sanitized = sanitized.replace(/href\s*=\s*"javascript:[^"]*"/gi, "href=\"#\"");
  sanitized = sanitized.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");

  // Normalize color values: convert rgb(R, G, B) to lowercase hex #rrggbb to avoid SSR/CSR mismatches
  sanitized = sanitized.replace(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi, (_m, r, g, b) => {
    const clamp = (n: number) => Math.max(0, Math.min(255, n | 0));
    const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
    return `#${toHex(Number(r))}${toHex(Number(g))}${toHex(Number(b))}`;
  });

  return sanitized;
}


