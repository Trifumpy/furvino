import { createReadStream } from "fs";
import { writeFile, readFile, mkdir, rm, readdir, stat } from "fs/promises";
import { Readable } from "stream";
import { NotFoundError } from "./errors";
import path from "path";
import mime from "mime";
import { SETTINGS } from "./settings";

const ROOT = SETTINGS.stack.mountedRoot;
const BASE_FOLDER = path.join(ROOT, SETTINGS.stack.prefix);

export async function uploadFileToStack(
  filePath: string,
  file: Blob | File
): Promise<string> {
  const stackPath = path.join(SETTINGS.stack.prefix, filePath);
  const fullPath = path.join(ROOT, filePath);

  await ensureFolderExists(path.dirname(filePath));

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(fullPath, buffer);

  return stackPath;
}

export async function ensureFolderExists(folderPath: string): Promise<void> {
  const fullPath = path.join(BASE_FOLDER, folderPath);
  await mkdir(fullPath, { recursive: true });
}

export async function readFileFromStack(filePath: string): Promise<Buffer> {
  const fullPath = path.join(BASE_FOLDER, filePath);
  return await readFile(fullPath);
}

export async function streamFileFromStack(filePath: string): Promise<TypedFileStream> {
  const fullPath = path.join(BASE_FOLDER, filePath);
  return getTypedStreamFromPath(fullPath);
}

export async function clearStackFolder(folderPath: string): Promise<void> {
  const fullPath = path.join(BASE_FOLDER, folderPath);

  // Ensure the folder exists
  await mkdir(fullPath, { recursive: true });

  // Read all items in the folder
  const entries = await readdir(fullPath);

  // Remove each entry individually
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(fullPath, entry);
      const entryStat = await stat(entryPath);
      if (entryStat.isDirectory()) {
        await rm(entryPath, { recursive: true, force: true });
      } else {
        await rm(entryPath, { force: true });
      }
    })
  );
}

export async function deleteStackFolder(folderPath: string): Promise<void> {
  const fullPath = path.join(BASE_FOLDER, folderPath);
  await rm(fullPath, { recursive: true, force: true });
}

// Helper types
type GetFileByFolderStreamOptions = {
  stream: true;
};
type GetFileByFolderBufferOptions = {
  stream?: false; // default
};

export type TypedFileStream = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
};

// Overload signatures
export async function getFileByFolder(
  folderPath: string,
  options: GetFileByFolderStreamOptions
): Promise<TypedFileStream>;
export async function getFileByFolder(
  folderPath: string,
  options?: GetFileByFolderBufferOptions
): Promise<Buffer>;
// Implementation
export async function getFileByFolder(
  folderPath: string,
  options: GetFileByFolderStreamOptions | GetFileByFolderBufferOptions = {}
): Promise<Buffer | TypedFileStream> {
  const foundFile = await getFirstFilePathInFolder(folderPath);

  if (!foundFile) {
    throw new Error(`No files found in the specified folder: ${folderPath}`);
  }

  if (options.stream) {
    const fileReadStream = createReadStream(foundFile);
    return {
      stream: convertReadableToWebStream(fileReadStream),
      contentType: mime.getType(foundFile) || "application/octet-stream"
    };
  } else {
    return await readFile(foundFile);
  }
}

async function getFirstFilePathInFolder(
  folderPath: string
): Promise<string | null> {
  const fullPath = path.join(BASE_FOLDER, folderPath);
  const entries = await readdir(fullPath);

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry);
    const stats = await stat(entryPath);
    if (stats.isFile()) {
      return entryPath;
    }
  }
  return null;
}

export function sanitizeFilename(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function fetchRemoteStream(url: string): Promise<ReadableStream> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new NotFoundError(`Failed to fetch remote thumbnail from ${url}`);
  }
  return res.body;
}

// Converts Node Readable -> Web ReadableStream
export function convertReadableToWebStream(readable: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      readable.on("data", (chunk) => controller.enqueue(chunk));
      readable.on("end", () => controller.close());
      readable.on("error", (err) => controller.error(err));
    }
  });
}

export function getTypedStreamFromPath(filePath: string): TypedFileStream {
  const contentType = mime.getType(filePath) || "application/octet-stream";
  const fileReadStream = createReadStream(filePath);
  return {
    stream: convertReadableToWebStream(fileReadStream),
    contentType
  };
}
