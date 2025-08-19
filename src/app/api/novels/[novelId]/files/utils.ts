import { clearStackFolder, sanitizeFilename, uploadFileToStack } from "@/app/api/files";
import { Platform } from "@/contracts/novels";
import path from "path";

export function getUploadFolder(
  novelId: string,
  platform: Platform,
): string {
  return path.join("novels", novelId, "files", platform);
}

export async function saveNovelFile(folderPath: string, file: File): Promise<string> {
  const sanitizedFilename = sanitizeFilename(file.name);
  await clearStackFolder(folderPath);
  const fullPath = path.join(folderPath, sanitizedFilename);
  return await uploadFileToStack(fullPath, file);
}
