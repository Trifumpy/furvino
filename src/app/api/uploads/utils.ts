import { SETTINGS } from "@/app/api/settings";
import { ensureFolderExists, sanitizeFilename, convertWebToNodeReadable } from "@/app/api/files";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { createWriteStream, existsSync, createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { StackService } from "../stack";

export type InitUploadRequest = {
  targetFolder: string; // relative to STACK prefix (e.g. "novels/<id>/files/web")
  filename: string;
  totalSize?: number;
  partSize?: number; // bytes
};

export type InitUploadResponse = {
  uploadId: string;
  partSize: number;
  filename: string;
  targetFolder: string;
  stackPath: string; // prefix/targetFolder/filename (relative to STACK root)
};

export type UploadMeta = {
  id: string;
  filename: string;
  sanitizedFilename: string;
  targetFolder: string;
  partSize: number;
  totalSize?: number;
  createdAt: number;
};

const DEFAULT_PART_SIZE = 8 * 1024 * 1024; // 8 MiB

const STACK_ROOT = SETTINGS.stack.mountedRoot;
const STACK_PREFIX = SETTINGS.stack.prefix;

export function generateUploadId(): string {
  return crypto.randomUUID();
}

function getPartsDir(uploadId: string): string {
  // Parts stored directly in WebDAV under .parts folder
  return path.join(STACK_ROOT, STACK_PREFIX, ".parts", uploadId);
}

function getPartPath(uploadId: string, partNumber: number): string {
  return path.join(getPartsDir(uploadId), `part-${partNumber}`);
}

export async function initUpload(req: InitUploadRequest): Promise<InitUploadResponse> {
  const uploadId = generateUploadId();

  const safeFolder = normalizeRelativePath(req.targetFolder);
  const safeFilename = sanitizeFilename(req.filename);
  const partSize = req.partSize && req.partSize > 0 ? req.partSize : DEFAULT_PART_SIZE;

  // Create parts directory
  const partsDir = getPartsDir(uploadId);
  await mkdir(partsDir, { recursive: true });

  const meta: UploadMeta = {
    id: uploadId,
    filename: req.filename,
    sanitizedFilename: safeFilename,
    targetFolder: safeFolder,
    partSize,
    totalSize: req.totalSize,
    createdAt: Date.now(),
  };

  // Store metadata in the parts directory
  await writeFile(path.join(partsDir, "meta.json"), JSON.stringify(meta, null, 2));

  return {
    uploadId,
    partSize,
    filename: safeFilename,
    targetFolder: safeFolder,
    stackPath: path.posix.join(STACK_PREFIX, safeFolder.replace(/\\/g, "/"), safeFilename),
  };
}

export async function getUploadMeta(uploadId: string): Promise<UploadMeta> {
  const metaPath = path.join(getPartsDir(uploadId), "meta.json");
  const metaRaw = await readFile(metaPath, "utf8");
  return JSON.parse(metaRaw) as UploadMeta;
}

export async function listReceivedParts(uploadId: string): Promise<number[]> {
  const dir = getPartsDir(uploadId);
  if (!existsSync(dir)) return [];
  
  const entries = await readdir(dir);
  const partNumbers: number[] = [];
  for (const e of entries) {
    const m = /^part-(\d+)$/.exec(e);
    if (m) {
      partNumbers.push(parseInt(m[1], 10));
    }
  }
  partNumbers.sort((a, b) => a - b);
  return partNumbers;
}

export async function writeUploadPart(uploadId: string, partNumber: number, body: ReadableStream): Promise<void> {
  if (!Number.isFinite(partNumber) || partNumber <= 0) {
    throw new Error("Invalid partNumber");
  }
  
  const partPath = getPartPath(uploadId, partNumber);
  const nodeReadable = convertWebToNodeReadable(body);
  const ws = createWriteStream(partPath, { flags: "w" });
  await pipeline(nodeReadable, ws);
}

export async function assembleAndMoveToStack(uploadId: string, expectedTotalParts?: number): Promise<{ stackPath: string; shareUrl: string }> {
  const meta = await getUploadMeta(uploadId);
  const partsDir = getPartsDir(uploadId);

  const parts = await listReceivedParts(uploadId);
  if (!parts.length) {
    throw new Error("No parts uploaded");
  }
  if (expectedTotalParts && parts.length !== expectedTotalParts) {
    throw new Error(`Incomplete upload: received ${parts.length} of ${expectedTotalParts} parts`);
  }

  // Ensure target folder exists under STACK
  await ensureFolderExists(meta.targetFolder);

  const stackRelativePath = path.join(meta.targetFolder, meta.sanitizedFilename);
  const finalFullPath = path.join(STACK_ROOT, STACK_PREFIX, stackRelativePath);

  console.log(`[Upload] Assembling ${parts.length} parts for ${uploadId} → ${stackRelativePath}`);

  const writeStream = createWriteStream(finalFullPath, { flags: "w" });
  const concatStream = Readable.from((async function* concatParts() {
    for (const partNumber of parts) {
      const partPath = getPartPath(uploadId, partNumber);
      console.log(`[Upload] Appending part ${partNumber} for ${uploadId}`);
      const rs = createReadStream(partPath);
      try {
        for await (const chunk of rs) {
          yield chunk as Buffer;
        }
      } finally {
        rs.destroy();
      }
    }
  })());

  try {
    await pipeline(concatStream, writeStream);
    console.log(`[Upload] Assembly complete for ${uploadId}`);
  } catch (err) {
    console.error(`[Upload] Failed assembling upload ${uploadId}`, err);
    await rm(finalFullPath, { force: true }).catch(() => {
      // Ignore cleanup failure
    });
    throw err;
  } finally {
    await rm(partsDir, { recursive: true, force: true }).catch((cleanupErr) => {
      console.warn(`[Upload] Failed to remove temporary parts for ${uploadId}:`, cleanupErr);
    });
  }

  // Cleanup already handled in finally; ensure directory exists before continuing

  const stack = StackService.get();

  // Poll for the file to appear in STACK after the watcher syncs it
  // Retry more frequently and for a longer period (1000ms for up to 5 minutes)
  const maxAttempts = 300; // 300 * 1000ms = ~300s (5 minutes)
  const intervalMs = 1000;
  let nodeId: number | null = null;
  // Query by absolute path under /files
  // We use posix to ensure the path uses forward slashes
  const absoluteFilesPath = path.posix.join("files", STACK_PREFIX.replace(/\\/g, "/"), stackRelativePath.replace(/\\/g, "/"));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    nodeId = await stack.getNodeIdByPath(absoluteFilesPath);
    if (nodeId) break;
    if (attempt % 30 === 0) {
      console.log(`[Upload] Waiting for STACK sync (${attempt + 1}/${maxAttempts}) for ${stackRelativePath}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (!nodeId) {
    throw new Error("File not yet available in STACK after upload. Please try again in a moment.");
  }

  const shareUrl = await stack.shareNode(nodeId);

  return {
    stackPath: path.posix.join(STACK_PREFIX, stackRelativePath.replace(/\\/g, "/")),
    shareUrl,
  };
}

export function normalizeRelativePath(p: string): string {
  const normalized = path.posix.normalize(p.replace(/\\/g, "/"));
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") {
    throw new Error("Invalid targetFolder path");
  }
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}


