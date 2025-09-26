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
  const resp = await fetch(`${auth.baseUrl}/node?parentID=${parentID}&limit=100`, {
    headers: { "x-sessiontoken": auth.sessionToken },
  });
  if (!resp.ok) throw new Error(`STACK list nodes failed (${resp.status})`);
  const data = (await resp.json()) as { nodes: { id: number; name: string; dir: boolean }[] };
  return data.nodes;
}

export async function createDirectory(auth: StackAuth, parentID: number, name: string): Promise<number> {
  const resp = await fetch(`${auth.baseUrl}/node`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sessiontoken": auth.sessionToken },
    body: JSON.stringify({ parentID, name }),
  });
  if (!resp.ok) throw new Error(`STACK create directory failed (${resp.status})`);
  const data = (await resp.json()) as { id: number };
  return data.id;
}

export async function uploadFile(auth: StackAuth, parentID: number, filename: string, content: Buffer): Promise<number> {
  const resp = await fetch(`${auth.baseUrl}/upload`, {
    method: "POST",
    headers: {
      "x-sessiontoken": auth.sessionToken,
      "x-filebytesize": content.length.toString(),
      "x-parentid": parentID.toString(),
      "x-filename": Buffer.from(filename).toString("base64"),
      "x-overwrite": "false",
      "Content-Type": "application/octet-stream",
      "Content-Length": String(content.byteLength),
    },
    body: new Uint8Array(content.buffer, content.byteOffset, content.byteLength).slice().buffer,
  });
  if (!resp.ok) throw new Error(`STACK upload failed (${resp.status})`);
  const idHeader = resp.headers.get("x-id");
  if (!idHeader) throw new Error("STACK upload: missing node id");
  return parseInt(idHeader, 10);
}

export async function createPublicShare(auth: StackAuth, nodeId: number): Promise<{ urlToken: string }> {
  const resp = await fetch(`${auth.baseUrl}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sessiontoken": auth.sessionToken },
    body: JSON.stringify({ nodeId, type: "Public" }),
  });
  if (!resp.ok) throw new Error(`STACK create share failed (${resp.status})`);
  return (await resp.json()) as { urlToken: string };
}


