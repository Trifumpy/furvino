import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { readFile, unlink } from "fs/promises";

interface ParsedFile {
  name: string;
  filename: string;
  contentType: string;
  size: number;
  tempPath: string;
}

export async function parseMultipartStream(
  request: Request,
  maxSize: number
): Promise<{ files: ParsedFile[]; fields: Record<string, string> }> {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('multipart/form-data')) {
    throw new Error('Not a multipart request');
  }

  // Extract boundary from content-type header
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in content-type');
  }
  const boundary = boundaryMatch[1];
  // Note: boundaryBuffer and endBoundaryBuffer are used for multipart parsing reference
  // const boundaryBuffer = Buffer.from(`\r\n--${boundary}`);
  // const endBoundaryBuffer = Buffer.from(`\r\n--${boundary}--`);

  if (!request.body) {
    throw new Error('No request body');
  }

  const reader = request.body.getReader();
  let buffer = Buffer.alloc(0);
  let totalSize = 0;
  const files: ParsedFile[] = [];
  const fields: Record<string, string> = {};

  try {
    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      
      if (value) {
        const chunk = Buffer.from(value);
        totalSize += chunk.length;
        
        if (totalSize > maxSize) {
          throw new Error(`Request size ${totalSize} bytes exceeds limit of ${maxSize} bytes`);
        }
        
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Process complete parts in the buffer
      await processBuffer(buffer, files, fields, done);
    }

    return { files, fields };
  } finally {
    reader.releaseLock();
  }
}

async function processBuffer(
  buffer: Buffer,
  files: ParsedFile[],
  fields: Record<string, string>,
  _isComplete: boolean
): Promise<void> {
  const boundaryBuffer = Buffer.from('\r\n--');
  let startIndex = 0;

  while (true) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, startIndex);
    if (boundaryIndex === -1) {
      break;
    }

    const partBuffer = buffer.subarray(startIndex, boundaryIndex);
    if (partBuffer.length > 0) {
      await processPart(partBuffer, files, fields);
    }

    startIndex = boundaryIndex + boundaryBuffer.length;
    
    // Skip the boundary name and check for end boundary
    const nextCRLF = buffer.indexOf('\r\n', startIndex);
    if (nextCRLF !== -1) {
      const boundaryLine = buffer.subarray(startIndex, nextCRLF).toString();
      if (boundaryLine.endsWith('--')) {
        break; // End boundary found
      }
      startIndex = nextCRLF + 2;
    }
  }
}

async function processPart(
  partBuffer: Buffer,
  files: ParsedFile[],
  fields: Record<string, string>
): Promise<void> {
  const headerEndIndex = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
  if (headerEndIndex === -1) return;

  const headersStr = partBuffer.subarray(0, headerEndIndex).toString();
  const bodyBuffer = partBuffer.subarray(headerEndIndex + 4);

  // Parse Content-Disposition header
  const dispositionMatch = headersStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
  if (!dispositionMatch) return;

  const fieldName = dispositionMatch[1];
  const filename = dispositionMatch[2];

  if (filename) {
    // This is a file field
    const contentTypeMatch = headersStr.match(/Content-Type:\s*(.+)/i);
    const contentType = contentTypeMatch?.[1]?.trim() || 'application/octet-stream';

    // Save file to temporary location
    const tempDir = tmpdir();
    const tempFilename = `upload_${randomUUID()}_${filename}`;
    const tempPath = join(tempDir, tempFilename);

    await mkdir(join(tempDir), { recursive: true });
    await writeFile(tempPath, bodyBuffer);

    files.push({
      name: fieldName,
      filename,
      contentType,
      size: bodyBuffer.length,
      tempPath
    });
  } else {
    // This is a text field
    fields[fieldName] = bodyBuffer.toString().trim();
  }
}

// Convert parsed file to File-like object for compatibility
export async function createFileFromParsed(parsedFile: ParsedFile): Promise<File> {
  try {
    const fileBuffer = await readFile(parsedFile.tempPath);
    const blob = new Blob([fileBuffer], { type: parsedFile.contentType });
    
    // Create a File object that mimics the browser File API
    const file = new File([blob], parsedFile.filename, { 
      type: parsedFile.contentType,
      lastModified: Date.now()
    });

    // Clean up temp file
    await unlink(parsedFile.tempPath).catch(() => {}); // Ignore cleanup errors

    return file;
  } catch (error) {
    throw new Error(`Failed to read temp file: ${error}`);
  }
}

export async function cleanupTempFiles(files: ParsedFile[]): Promise<void> {
  await Promise.all(
    files.map(file => 
      unlink(file.tempPath).catch(() => {}) // Ignore errors, file might already be deleted
    )
  );
}
