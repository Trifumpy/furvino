import { Platform } from "@/contracts/novels";
import path from "path";

export function getUploadFolder(
  novelId: string,
  platform: Platform,
): string {
  return path.join("novels", novelId, "files", platform);
}
