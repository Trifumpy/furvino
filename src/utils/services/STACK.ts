export type StackAuth = {
  baseUrl: string;
  sessionToken: string;
};

export async function authenticate(baseUrl: string, username: string, password: string): Promise<StackAuth> {
  const resp = await fetch(`${baseUrl}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) throw new Error(`STACK auth failed (${resp.status})`);
  const sessionToken = resp.headers.get("x-sessiontoken");
  if (!sessionToken) throw new Error("STACK auth: missing session token");
  if (resp.headers.get("x-2fa-required") === "true") throw new Error("STACK auth: 2FA required");
  return { baseUrl, sessionToken };
}

export async function getMe(auth: StackAuth): Promise<{ filesNodeID: number }> {
  const resp = await fetch(`${auth.baseUrl}/me`, { headers: { "x-sessiontoken": auth.sessionToken } });
  if (!resp.ok) throw new Error(`STACK /me failed (${resp.status})`);
  return (await resp.json()) as { filesNodeID: number };
}

export async function listChildren(auth: StackAuth, parentID: number): Promise<Array<{ id: number; name: string; dir: boolean }>> {
  const resp = await fetch(`${auth.baseUrl}/nodes?parentID=${parentID}&limit=100`, {
    headers: { "x-sessiontoken": auth.sessionToken },
  });
  if (!resp.ok) throw new Error(`STACK list nodes failed (${resp.status})`);
  const data = (await resp.json()) as { nodes: { id: number; name: string; dir: boolean }[] };
  return data.nodes;
}

export async function createDirectory(auth: StackAuth, parentID: number, name: string): Promise<number> {
  const payload = { parentID, name };
  const resp = await fetch(`${auth.baseUrl}/directories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sessiontoken": auth.sessionToken },
    body: JSON.stringify(payload),
  });
  
  // 409 means directory already exists - that's OK, just return its ID
  if (resp.status === 409) {
    const idHeader = resp.headers.get("x-id");
    if (!idHeader) throw new Error("STACK create directory: directory exists but missing x-id header");
    return parseInt(idHeader, 10);
  }
  
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`STACK create directory failed (${resp.status}): ${errorText}. Request: ${JSON.stringify(payload)}`);
  }
  
  const idHeader = resp.headers.get("x-id");
  if (!idHeader) throw new Error("STACK create directory: missing x-id header");
  return parseInt(idHeader, 10);
}

export async function uploadFile(
  auth: StackAuth,
  parentID: number,
  filename: string,
  content: ArrayBuffer | Uint8Array | Blob
): Promise<number> {
  let body: Blob;
  let byteSize: number;

  if (content instanceof Blob) {
    body = content;
    byteSize = content.size;
  } else if (content instanceof Uint8Array) {
    // Create a copy to ensure it's backed by ArrayBuffer, not SharedArrayBuffer
    const copy = new Uint8Array(content.byteLength);
    copy.set(content);
    body = new Blob([copy], { type: "application/octet-stream" });
    byteSize = content.byteLength;
  } else {
    const ab = content as ArrayBuffer;
    body = new Blob([ab], { type: "application/octet-stream" });
    byteSize = ab.byteLength;
  }

  const resp = await fetch(`${auth.baseUrl}/upload`, {
    method: "POST",
    headers: {
      "x-sessiontoken": auth.sessionToken,
      "x-filebytesize": byteSize.toString(),
      "x-parentid": parentID.toString(),
      "x-filename": Buffer.from(filename).toString("base64"),
      "x-overwrite": "true",
      "Content-Type": "application/octet-stream",
    },
    body,
  });
  
  // 409 means file already exists and we're overwriting - STACK should handle this, but just in case
  if (resp.status === 409) {
    const idHeader = resp.headers.get("x-id");
    if (idHeader) return parseInt(idHeader, 10);
    // If no ID header, fall through to error handling
  }
  
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`STACK upload failed (${resp.status}): ${errorText}`);
  }
  
  const idHeader = resp.headers.get("x-id");
  if (!idHeader) throw new Error("STACK upload: missing node id");
  return parseInt(idHeader, 10);
}

export async function createPublicShare(auth: StackAuth, nodeId: number): Promise<{ urlToken: string; shareId?: number }> {
  const resp = await fetch(`${auth.baseUrl}/node-shares`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sessiontoken": auth.sessionToken },
    body: JSON.stringify({
      nodeId,
      type: "Public",
      password: "",
      permissions: {
        createFile: true,
        createDirectory: true,
        readFile: true,
        readDirectory: true,
        updateFile: false,
        updateDirectory: false,
        deleteFile: false,
        deleteDirectory: false,
      }
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`STACK create share failed (${resp.status}): ${errorText}`);
  }

  const urlToken = resp.headers.get("x-urltoken");
  const shareId = resp.headers.get("x-shareid");

  if (!urlToken) throw new Error("STACK create share: missing x-urltoken header");

  return {
    urlToken,
    shareId: shareId ? parseInt(shareId, 10) : undefined
  };
}


