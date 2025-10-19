import { SETTINGS } from "@/app/api/settings";
import { ensureFolderExists, sanitizeFilename, convertWebToNodeReadable } from "@/app/api/files";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { createWriteStream, existsSync, createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
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
  // Incremental assembly state for streaming
  assembledParts: number; // number of parts already appended to final file
  stackRelativePath: string; // targetFolder/sanitizedFilename
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

  // Ensure destination folder exists and clear any stale final file
  await ensureFolderExists(safeFolder);
  const stackRelativePath = path.join(safeFolder, safeFilename);
  const finalFullPath = path.join(STACK_ROOT, STACK_PREFIX, stackRelativePath);
  await rm(finalFullPath, { force: true }).catch(() => {
    // ignore
  });

  const meta: UploadMeta = {
    id: uploadId,
    filename: req.filename,
    sanitizedFilename: safeFilename,
    targetFolder: safeFolder,
    partSize,
    totalSize: req.totalSize,
    createdAt: Date.now(),
    assembledParts: 0,
    stackRelativePath,
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

// In-memory per-upload flush state to serialize assembly operations
const flushStateMap = new Map<string, { running: boolean; pending: boolean }>();

function getFinalFullPath(meta: UploadMeta): string {
  return path.join(STACK_ROOT, STACK_PREFIX, meta.stackRelativePath);
}

async function writeMeta(uploadId: string, meta: UploadMeta): Promise<void> {
  const partsDir = getPartsDir(uploadId);
  await writeFile(path.join(partsDir, "meta.json"), JSON.stringify(meta, null, 2));
}

async function flushSequentialParts(uploadId: string): Promise<void> {
  const meta = await getUploadMeta(uploadId);
  const finalFullPath = getFinalFullPath(meta);

  let nextPart = (meta.assembledParts ?? 0) + 1;

  // Append all contiguous parts starting from nextPart
  while (existsSync(getPartPath(uploadId, nextPart))) {
    const partPath = getPartPath(uploadId, nextPart);
    const rs = createReadStream(partPath);
    const ws = createWriteStream(finalFullPath, { flags: "a" });
    await pipeline(rs, ws);
    await rm(partPath, { force: true }).catch(() => {});

    meta.assembledParts = nextPart;
    await writeMeta(uploadId, meta);
    nextPart += 1;
  }
}

async function triggerFlush(uploadId: string): Promise<void> {
  const state = flushStateMap.get(uploadId) || { running: false, pending: false };
  flushStateMap.set(uploadId, state);
  if (state.running) {
    state.pending = true;
    return;
  }
  state.running = true;
  try {
    do {
      state.pending = false;
      await flushSequentialParts(uploadId);
    } while (state.pending);
  } finally {
    state.running = false;
  }
}

async function waitForFlushIdle(uploadId: string): Promise<void> {
  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const start = Date.now();
  while (true) {
    const state = flushStateMap.get(uploadId) || { running: false, pending: false };
    if (!state.running && !state.pending) return;
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for upload assembly to finish");
    await new Promise((r) => setTimeout(r, 50));
  }
}

export async function writeUploadPart(uploadId: string, partNumber: number, body: ReadableStream): Promise<void> {
  if (!Number.isFinite(partNumber) || partNumber <= 0) {
    throw new Error("Invalid partNumber");
  }
  
  const partPath = getPartPath(uploadId, partNumber);
  const nodeReadable = convertWebToNodeReadable(body);
  const ws = createWriteStream(partPath, { flags: "w" });
  await pipeline(nodeReadable, ws);
  // Schedule a background flush to append newly arrived sequential parts
  void triggerFlush(uploadId);
}

export async function assembleAndMoveToStack(uploadId: string, expectedTotalParts?: number): Promise<{ stackPath: string; shareUrl: string }> {
  // Kick off/complete any remaining flush work and wait until idle
  await triggerFlush(uploadId);
  await waitForFlushIdle(uploadId);

  const meta = await getUploadMeta(uploadId);
  const partsDir = getPartsDir(uploadId);

  // Validate completeness
  if (expectedTotalParts && (meta.assembledParts ?? 0) !== expectedTotalParts) {
    const received = await listReceivedParts(uploadId);
    throw new Error(`Incomplete upload: assembled ${meta.assembledParts ?? 0} of ${expectedTotalParts} parts (received ${received.length})`);
  }

  // Cleanup temporary parts directory
  await rm(partsDir, { recursive: true, force: true }).catch((cleanupErr) => {
    console.warn(`[Upload] Failed to remove temporary parts for ${uploadId}:`, cleanupErr);
  });

  const stack = StackService.get();

  // Poll for the file to appear in STACK after the watcher syncs it
  const maxAttempts = 300; // ~5 minutes
  const intervalMs = 1000;
  let nodeId: number | null = null;
  const stackRelativePath = meta.stackRelativePath.replace(/\\/g, "/");
  const absoluteFilesPath = path.posix.join("files", STACK_PREFIX.replace(/\\/g, "/"), stackRelativePath);
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
    stackPath: path.posix.join(STACK_PREFIX, stackRelativePath),
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


