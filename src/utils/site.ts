export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, "");
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && vercelUrl.length > 0) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

export const metadataBaseUrl = new URL(getSiteUrl());

export function canonicalPath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${canonicalPath(path)}`;
}


