// components/SafeImage.tsx
"use client";

import { Box } from "@mui/material";
import type { ImgHTMLAttributes } from "react";
import Image, { ImageProps } from "next/image";

const TRUSTED_DOMAINS = [
  "stack.furvino.com",
  "cdn.furvino.com",
  "stack.furvino.org",
  "cdn.furvino.org",
  "localhost",
];

function isTrusted(url: string) {
  try {
    const parsed = new URL(url, "http://dummy");
    return url.startsWith("/") || TRUSTED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function SafeImage(props: ImageProps & { src: string }) {
  const { src, alt, ...restAll } = props;

  if (isTrusted(src)) {
    // Let Next/Image set optimal caching/headers for trusted hosts
    return <Image src={src} alt={alt} {...restAll} />;
  }

  // Strip Next/Image-only props that are not valid on a native img element
  const domRest: Record<string, unknown> = { ...(restAll as Record<string, unknown>) };
  delete (domRest as Record<string, unknown>).priority;
  delete (domRest as Record<string, unknown>).fill;
  delete (domRest as Record<string, unknown>).placeholder;
  delete (domRest as Record<string, unknown>).blurDataURL;
  delete (domRest as Record<string, unknown>).loader;
  delete (domRest as Record<string, unknown>).quality;
  delete (domRest as Record<string, unknown>).sizes;
  delete (domRest as Record<string, unknown>).unoptimized;
  delete (domRest as Record<string, unknown>).onLoadingComplete;

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      {...(domRest as Partial<ImgHTMLAttributes<HTMLImageElement>>)}
    />
  );
}
