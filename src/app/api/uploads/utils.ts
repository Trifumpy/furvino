import { SETTINGS } from "@/app/api/settings";
import { ensureFolderExists, sanitizeFilename, convertWebToNodeReadable } from "@/app/api/files";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { createWriteStream, existsSync, createReadStream } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { pipeline } from "stream/promises";

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

const TMP_ROOT = process.env.UPLOAD_TMP_ROOT || path.join(os.tmpdir(), "furvino-uploads");
const STACK_ROOT = SETTINGS.stack.mountedRoot;
const STACK_PREFIX = SETTINGS.stack.prefix;

export function generateUploadId(): string {
  return crypto.randomUUID();
}

export function getTmpDirForUpload(uploadId: string): string {
  return path.join(TMP_ROOT, uploadId);
}

function getMetaPath(uploadId: string): string {
  return path.join(getTmpDirForUpload(uploadId), "meta.json");
}

export async function initUpload(req: InitUploadRequest): Promise<InitUploadResponse> {
  const uploadId = generateUploadId();
  const tmpDir = getTmpDirForUpload(uploadId);
  await mkdir(tmpDir, { recursive: true });

  const safeFolder = normalizeRelativePath(req.targetFolder);
  const safeFilename = sanitizeFilename(req.filename);
  const partSize = req.partSize && req.partSize > 0 ? req.partSize : DEFAULT_PART_SIZE;

  const meta: UploadMeta = {
    id: uploadId,
    filename: req.filename,
    sanitizedFilename: safeFilename,
    targetFolder: safeFolder,
    partSize,
    totalSize: req.totalSize,
    createdAt: Date.now(),
  };

  await writeFile(getMetaPath(uploadId), JSON.stringify(meta, null, 2));

  return {
    uploadId,
    partSize,
    filename: safeFilename,
    targetFolder: safeFolder,
    stackPath: path.posix.join(STACK_PREFIX, safeFolder.replace(/\\/g, "/"), safeFilename),
  };
}

export async function getUploadMeta(uploadId: string): Promise<UploadMeta> {
  const metaRaw = await readFile(getMetaPath(uploadId), "utf8");
  return JSON.parse(metaRaw) as UploadMeta;
}

export async function listReceivedParts(uploadId: string): Promise<number[]> {
  const dir = getTmpDirForUpload(uploadId);
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
  const dir = getTmpDirForUpload(uploadId);
  if (!existsSync(dir)) {
    throw new Error("Upload not initialized");
  }
  const partPath = path.join(dir, `part-${partNumber}`);
  const nodeReadable = convertWebToNodeReadable(body);
  const ws = createWriteStream(partPath, { flags: "w" });
  await pipeline(nodeReadable, ws);
}

export async function assembleAndMoveToStack(uploadId: string, expectedTotalParts?: number): Promise<string> {
  const meta = await getUploadMeta(uploadId);
  const dir = getTmpDirForUpload(uploadId);

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

  // Write assembled file to a temp file first, then move/replace atomically
  const assembledPath = path.join(dir, "assembled.bin");
  // Truncate if exists
  await writeFile(assembledPath, "");

  const ws = createWriteStream(assembledPath, { flags: "w" });
  for (const p of parts) {
    const partPath = path.join(dir, `part-${p}`);
    const rs = createReadStream(partPath);
    await pipeline(rs, ws, { end: false });
  }
  await new Promise<void>((resolve, reject) => {
    ws.end(() => resolve());
    ws.on("error", (e) => reject(e));
  });

  // Move to final location using streaming to avoid buffering entire file in memory
  await ensureFolderExists(meta.targetFolder);
  await pipeline(createReadStream(assembledPath), createWriteStream(finalFullPath));

  // Cleanup tmp
  await rm(dir, { recursive: true, force: true });

  return path.posix.join(STACK_PREFIX, stackRelativePath.replace(/\\/g, "/"));
}

export function normalizeRelativePath(p: string): string {
  const normalized = path.posix.normalize(p.replace(/\\/g, "/"));
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") {
    throw new Error("Invalid targetFolder path");
  }
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}


