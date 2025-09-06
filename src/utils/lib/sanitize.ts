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

  return sanitized;
}


