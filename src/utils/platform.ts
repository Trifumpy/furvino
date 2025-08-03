import { Platform } from "@/novels/types";

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "windows";
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes("android")) return "android";
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
}
