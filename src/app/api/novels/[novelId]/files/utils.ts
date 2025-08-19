import { clearStackFolder, sanitizeFilename, uploadFileToStack } from "@/app/api/files";
import { StackService } from "@/app/api/stack/StackService";
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

export async function waitForNodeId(stackPath: string) {
  const stack = StackService.get();

  // Poll for the existing directory and file to appear in STACK after the watcher syncs it
  // Retry more frequently and for a longer period (1000ms for up to 5 minutes)
  const maxAttempts = 300; // 300 * 1000ms = ~300s (5 minutes)
  const intervalMs = 1000;
  let nodeId: number | null = null;
  // Try node-id endpoint by absolute path first (under /files)
  // We use posix to ensure the path uses forward slashes
  const absoluteFilesPath = path.posix.join("files", stackPath.replace(/\\/g, "/"));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    nodeId = await stack.getNodeIdByPath(absoluteFilesPath);
    if (nodeId) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (!nodeId) {
    throw new Error("File not yet available in STACK after upload. Please try again in a moment.");
  }

  return nodeId;
}
