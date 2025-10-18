import { authenticate, createDirectory, listChildren, getMe, type StackAuth } from "./STACK";
import { SETTINGS } from "@/app/api/settings";

export type UploadShareConfig = {
  shareURLToken: string;
  shareToken: string; // X-ShareToken for authorization
  shareID: number;
  parentNodeID: number;
  expiresAt: number;
};

/**
 * Finds or creates a directory path recursively under the user's files root.
 * @param auth STACK authentication
 * @param pathParts Array of directory names (e.g., ["novels", "abc123"])
 * @returns The nodeID of the final directory
 */
export async function findOrCreateDirectoryPath(
  auth: StackAuth,
  pathParts: string[]
): Promise<number> {
  const { filesNodeID } = await getMe(auth);
  let currentParentID = filesNodeID;

  for (const dirName of pathParts) {
    try {
      const children = await listChildren(auth, currentParentID);
      const existing = children.find((c) => c.name === dirName && c.dir);

      if (existing) {
        currentParentID = existing.id;
      } else {
        currentParentID = await createDirectory(auth, currentParentID, dirName);
      }
    } catch (err) {
      throw new Error(
        `Failed to find/create directory "${dirName}" in path [${pathParts.join("/")}]: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return currentParentID;
}

/**
 * Creates a temporary upload share for a novel's directory.
 * The share has upload-only permissions and expires in 30 minutes.
 * @param novelId The novel ID
 * @returns Share configuration for client-side uploads
 */
export async function createUploadShareForNovel(
  novelId: string
): Promise<UploadShareConfig> {
  const auth = await authenticate(
    SETTINGS.stack.apiUrl,
    SETTINGS.stack.username,
    SETTINGS.stack.password
  );

  // Find or create furvino/novels/<novelId>/ directory
  const novelDirNodeID = await findOrCreateDirectoryPath(auth, [
    SETTINGS.stack.prefix,
    "novels",
    novelId,
  ]);

  // Create a public share with upload-only permissions
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes

  const response = await fetch(`${auth.baseUrl}/node-shares`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sessiontoken": auth.sessionToken,
    },
    body: JSON.stringify({
      nodeId: novelDirNodeID,
      type: "Public",
      expiresAt,
      permissions: {
        createFile: true,
        createDirectory: true,
        readFile: false,
        readDirectory: false,
        updateFile: false,
        updateDirectory: false,
        deleteFile: false,
        deleteDirectory: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create share: ${response.status}`);
  }

  const shareURLToken = response.headers.get("x-urltoken");
  const shareIDHeader = response.headers.get("x-shareid");

  if (!shareURLToken || !shareIDHeader) {
    throw new Error("Missing share token or ID in response");
  }

  const shareID = parseInt(shareIDHeader, 10);

  // Authorize the share to get the X-ShareToken
  const authorizeResponse = await fetch(`${auth.baseUrl}/share/${shareURLToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!authorizeResponse.ok) {
    throw new Error(`Failed to authorize share: ${authorizeResponse.status}`);
  }

  const shareToken = authorizeResponse.headers.get("x-sharetoken");
  if (!shareToken) {
    throw new Error("Missing X-ShareToken in authorize response");
  }

  return {
    shareURLToken,
    shareToken,
    shareID,
    parentNodeID: novelDirNodeID,
    expiresAt,
  };
}

/**
 * Revokes (deletes) a share token.
 * @param shareID The share ID to revoke
 */
export async function revokeShare(shareID: number): Promise<void> {
  const auth = await authenticate(
    SETTINGS.stack.apiUrl,
    SETTINGS.stack.username,
    SETTINGS.stack.password
  );

  const response = await fetch(`${auth.baseUrl}/node-shares/${shareID}`, {
    method: "DELETE",
    headers: {
      "x-sessiontoken": auth.sessionToken,
    },
  });

  if (!response.ok && response.status !== 404) {
    // 404 is ok, share might already be deleted or expired
    throw new Error(`Failed to revoke share: ${response.status}`);
  }
}

