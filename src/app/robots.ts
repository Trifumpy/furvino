import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/utils/site";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NODE_ENV === "production";
  const sitemapUrl = absoluteUrl("/sitemap.xml");

  if (!isProd) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: sitemapUrl,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemapUrl,
  };
}


