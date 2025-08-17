// components/SafeImage.tsx
"use client";

import { Box } from "@mui/material";
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
  const { src, alt, ...rest } = props;

  if (isTrusted(src)) {
    // Let Next/Image set optimal caching/headers for trusted hosts
    return <Image src={src} alt={alt} {...rest} />;
  }

  return <Box component="img" src={src} alt={alt} {...rest} />;
}
