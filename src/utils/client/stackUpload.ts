export type ShareUploadConfig = {
  shareURLToken: string;
  shareToken: string;
  parentNodeID: number;
  expiresAt: number;
  stackApiUrl: string;
};

export type AuthorizeShareResult = {
  shareToken: string;
  csrfToken: string;
};

/**
 * Authorizes a share and gets the X-ShareToken needed for uploads.
 * @param shareURLToken The share URL token from the backend
 * @param stackApiUrl The STACK API base URL
 * @returns Share token and CSRF token
 */
export async function authorizeShare(
  shareURLToken: string,
  stackApiUrl: string
): Promise<AuthorizeShareResult> {
  const response = await fetch(`${stackApiUrl}/share/${shareURLToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to authorize share: ${response.status}`);
  }

  const shareToken = response.headers.get("x-sharetoken");
  const csrfToken = response.headers.get("x-csrf-token");

  if (!shareToken) {
    throw new Error("Missing share token in response");
  }

  return {
    shareToken,
    csrfToken: csrfToken || "",
  };
}

/**
 * Uploads a file directly to STACK using a share token.
 * @param file The file to upload
 * @param config Share upload configuration
 * @param targetPath Optional relative path within the share (e.g., "thumbnail", "files/windows")
 * @returns The uploaded file's node ID
 */
export async function uploadFileToShare(
  file: File,
  config: ShareUploadConfig,
  targetPath?: string
): Promise<number> {
  const { shareURLToken, shareToken, stackApiUrl } = config;
  let parentNodeID = config.parentNodeID;

  // If targetPath is provided, create subdirectories
  if (targetPath) {
    parentNodeID = await createDirectoriesInShare(
      targetPath,
      config
    );
  }

  // Upload the file
  const filename = file.name;
  const fileSize = file.size;

  const response = await fetch(`${stackApiUrl}/share/${shareURLToken}/upload`, {
    method: "POST",
    headers: {
      "x-sharetoken": shareToken,
      "x-filebytesize": fileSize.toString(),
      "x-parentid": parentNodeID.toString(),
      "x-filename": btoa(filename),
      "x-overwrite": "true",
      "Content-Type": "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload file: ${response.status} - ${errorText}`
    );
  }

  const nodeIDHeader = response.headers.get("x-id");
  if (!nodeIDHeader) {
    throw new Error("Missing node ID in upload response");
  }

  return parseInt(nodeIDHeader, 10);
}

/**
 * Creates nested directories in a share and returns the final directory's node ID.
 * @param path Relative path (e.g., "thumbnail" or "files/windows")
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
      const response = await fetch(`${stackApiUrl}/share/${shareURLToken}/directories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sharetoken": shareToken,
        },
        body: JSON.stringify({
          parentID: currentParentID,
          name: dirName,
        }),
      });

      // 409 means directory already exists - that's OK, just get its ID
      if (response.status === 409) {
        const idHeader = response.headers.get("x-id");
        if (!idHeader) {
          throw new Error(`Directory ${dirName} exists but missing x-id header`);
        }
        currentParentID = parseInt(idHeader, 10);
      } else if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Failed to create directory ${dirName} (${response.status}): ${errorText}`);
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

