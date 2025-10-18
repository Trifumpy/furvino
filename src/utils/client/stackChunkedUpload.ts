import type { ShareUploadConfig } from "./stackUpload";

export type ChunkedUploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
};

export type ChunkedUploadOptions = {
  chunkSize?: number; // Default 8MB
  onProgress?: (progress: ChunkedUploadProgress) => void;
};

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB
const MIN_CHUNK_SIZE = 1 * 1024 * 1024; // 1 MiB (STACK minimum)
const MAX_CHUNK_SIZE = 128 * 1024 * 1024; // 128 MiB (STACK maximum)

/**
 * Uploads a large file to STACK using chunked upload API.
 * Use this for files >50MB for better reliability and progress tracking.
 * @param file The file to upload
 * @param config Share upload configuration
 * @param targetPath Optional relative path within the share
 * @param options Upload options
 * @returns The uploaded file's node ID
 */
export async function uploadLargeFileToShare(
  file: File,
  config: ShareUploadConfig,
  targetPath?: string,
  options: ChunkedUploadOptions = {}
): Promise<number> {
  const { shareURLToken, shareToken, stackApiUrl } = config;
  let parentNodeID = config.parentNodeID;

  // If targetPath is provided, create subdirectories first
  if (targetPath) {
    parentNodeID = await createDirectoriesInShare(targetPath, config);
  }

  const chunkSize = Math.max(
    MIN_CHUNK_SIZE,
    Math.min(options.chunkSize || DEFAULT_CHUNK_SIZE, MAX_CHUNK_SIZE)
  );

  // Ensure chunk size is a multiple of 1 MiB
  const alignedChunkSize = Math.floor(chunkSize / MIN_CHUNK_SIZE) * MIN_CHUNK_SIZE;

  const filename = file.name;
  const fileSize = file.size;

  // Start upload session
  const startResponse = await fetch(
    `${stackApiUrl}/share/${shareURLToken}/upload/session/start`,
    {
      method: "POST",
      headers: {
        "x-sharetoken": shareToken,
        "x-filebytesize": fileSize.toString(),
        "x-chunkbytesize": alignedChunkSize.toString(),
        "x-parentid": parentNodeID.toString(),
        "x-filename": btoa(filename),
        "x-overwrite": "true",
      },
    }
  );

  if (!startResponse.ok) {
    throw new Error(`Failed to start upload session: ${startResponse.status}`);
  }

  const sessionID = startResponse.headers.get("x-sessionid");
  if (!sessionID) {
    throw new Error("Missing session ID in upload session response");
  }

  // Upload chunks
  let uploadedBytes = 0;
  const totalChunks = Math.ceil(fileSize / alignedChunkSize);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startOffset = chunkIndex * alignedChunkSize;
    const endOffset = Math.min(startOffset + alignedChunkSize, fileSize);
    const chunkBlob = file.slice(startOffset, endOffset);

    const appendResponse = await fetch(
      `${stackApiUrl}/share/${shareURLToken}/upload/session/append`,
      {
        method: "POST",
        headers: {
          "x-sharetoken": shareToken,
          "x-sessionid": sessionID,
          "x-startoffset": startOffset.toString(),
          "Content-Type": "application/octet-stream",
        },
        body: chunkBlob,
      }
    );

    if (!appendResponse.ok) {
      throw new Error(
        `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}: ${appendResponse.status}`
      );
    }

    uploadedBytes = endOffset;

    if (options.onProgress) {
      options.onProgress({
        uploadedBytes,
        totalBytes: fileSize,
        percent: Math.round((uploadedBytes / fileSize) * 100),
      });
    }
  }

  // Finalize upload session
  const finishResponse = await fetch(
    `${stackApiUrl}/share/${shareURLToken}/upload/session/finish`,
    {
      method: "POST",
      headers: {
        "x-sharetoken": shareToken,
        "x-sessionid": sessionID,
      },
    }
  );

  if (!finishResponse.ok) {
    throw new Error(`Failed to finalize upload: ${finishResponse.status}`);
  }

  const nodeIDHeader = finishResponse.headers.get("x-nodeid");
  if (!nodeIDHeader) {
    throw new Error("Missing node ID in finalize response");
  }

  return parseInt(nodeIDHeader, 10);
}

/**
 * Creates nested directories in a share and returns the final directory's node ID.
 * @param path Relative path (e.g., "files/windows")
 * @param config Share upload configuration
 * @returns The node ID of the final directory
 */
async function createDirectoriesInShare(
  path: string,
  config: ShareUploadConfig
): Promise<number> {
  const { shareURLToken, shareToken, stackApiUrl } = config;
  let currentParentID = config.parentNodeID;

  const pathParts = path.split("/").filter((p) => p.length > 0);

  for (const dirName of pathParts) {
    // Check if directory already exists
    const existingNodeID = await findDirectoryInShare(
      dirName,
      currentParentID,
      config
    );

    if (existingNodeID) {
      currentParentID = existingNodeID;
    } else {
      // Create the directory
      const response = await fetch(
        `${stackApiUrl}/share/${shareURLToken}/directories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sharetoken": shareToken,
          },
          body: JSON.stringify({
            parentID: currentParentID,
            name: dirName,
          }),
        }
      );

      // 409 means directory already exists - that's OK, just get its ID
      if (response.status === 409) {
        const idHeader = response.headers.get("x-id");
        if (!idHeader) {
          throw new Error(`Directory ${dirName} exists but missing x-id header`);
        }
        currentParentID = parseInt(idHeader, 10);
      } else if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Failed to create directory ${dirName} (${response.status}): ${errorText}`
        );
      } else {
        const idHeader = response.headers.get("x-id");
        if (!idHeader) {
          throw new Error(`Failed to create directory ${dirName}: missing x-id header`);
        }
        currentParentID = parseInt(idHeader, 10);
      }
    }
  }

  return currentParentID;
}

/**
 * Finds a directory by name within a parent in a share.
 * @param name Directory name to find
 * @param parentID Parent node ID
 * @param config Share upload configuration
 * @returns Node ID if found, null otherwise
 */
async function findDirectoryInShare(
  name: string,
  parentID: number,
  config: ShareUploadConfig
): Promise<number | null> {
  const { shareURLToken, shareToken, stackApiUrl } = config;

  const response = await fetch(
    `${stackApiUrl}/share/${shareURLToken}/nodes?parentID=${parentID}&limit=100`,
    {
      headers: {
        "x-sharetoken": shareToken,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const nodes = data.nodes as Array<{ id: number; name: string; dir: boolean }>;
  const found = nodes.find((n) => n.name === name && n.dir);

  return found ? found.id : null;
}

