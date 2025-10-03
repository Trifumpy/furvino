// components/SafeImage.tsx
"use client";

import { Box } from "@mui/material";
import type { ImgHTMLAttributes, CSSProperties } from "react";
import Image, { ImageProps } from "next/image";

const TRUSTED_DOMAINS = [
  "stack.furvino.com",
  "cdn.furvino.com",
  "stack.furvino.org",
  "cdn.furvino.org",
  "localhost",
  // placeholders and third-party avatars used in the app
  "placehold.co",
  "images.clerk.dev",
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
  const hadFill = Object.prototype.hasOwnProperty.call(restAll, "fill");
  delete (domRest as Record<string, unknown>).priority;
  delete (domRest as Record<string, unknown>).fill;
  delete (domRest as Record<string, unknown>).placeholder;
  delete (domRest as Record<string, unknown>).blurDataURL;
  delete (domRest as Record<string, unknown>).loader;
  delete (domRest as Record<string, unknown>).quality;
  delete (domRest as Record<string, unknown>).sizes;
  delete (domRest as Record<string, unknown>).unoptimized;
  delete (domRest as Record<string, unknown>).onLoadingComplete;

  // If the caller intended a "fill" layout but we are rendering a native <img>,
  // emulate it by ensuring the element stretches to the container.
  const styleFromProps = (domRest as Record<string, unknown>).style as CSSProperties | undefined;
  const mergedStyle: CSSProperties = { ...(styleFromProps || {}) };
  if (hadFill) {
    if (mergedStyle.position === undefined) mergedStyle.position = "absolute";
    if (mergedStyle.top === undefined) mergedStyle.top = 0;
    if (mergedStyle.right === undefined) mergedStyle.right = 0;
    if (mergedStyle.bottom === undefined) mergedStyle.bottom = 0;
    if (mergedStyle.left === undefined) mergedStyle.left = 0;
    if (mergedStyle.width === undefined) mergedStyle.width = "100%";
    if (mergedStyle.height === undefined) mergedStyle.height = "100%";
  }
  (domRest as Record<string, unknown>).style = mergedStyle as unknown as Record<string, unknown>;

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      {...(domRest as Partial<ImgHTMLAttributes<HTMLImageElement>>)}
    />
  );
}
