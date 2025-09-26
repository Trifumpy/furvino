import { SETTINGS } from "./settings";

export class StackService {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  static instance: StackService | null = null;
  static get(): StackService {
    if (!StackService.instance) {
      const { stack } = SETTINGS;
      StackService.instance = new StackService(stack.apiUrl, stack.username, stack.password);
    }
    return StackService.instance;
  }

  private async authenticate(): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    if (!resp.ok) throw new Error(`STACK auth failed (${resp.status})`);
    const sessionToken = resp.headers.get("x-sessiontoken");
    const is2FARequired = resp.headers.get("x-2fa-required") === "true";
    if (is2FARequired) throw new Error("STACK auth: 2FA required");
    if (!sessionToken) throw new Error("STACK auth: missing session token");
    return sessionToken;
  }

  private async getFilesRoot(sessionToken: string): Promise<number> {
    const resp = await fetch(`${this.baseUrl}/me`, { headers: { "x-sessiontoken": sessionToken } });
    if (!resp.ok) throw new Error(`STACK /me failed (${resp.status})`);
    const data = (await resp.json()) as { filesNodeID: number };
    return data.filesNodeID;
  }

  private async listChildren(sessionToken: string, parentID: number): Promise<Array<{ id: number; name: string; dir: boolean }>> {
    const resp = await fetch(`${this.baseUrl}/node?parentID=${parentID}&limit=100`, { headers: { "x-sessiontoken": sessionToken } });
    if (!resp.ok) {
      if (resp.status === 404) return [];
      throw new Error(`STACK list nodes failed (${resp.status})`);
    }
    const data = (await resp.json()) as { nodes: { id: number; name: string; dir: boolean }[] };
    return data.nodes;
  }

  private async ensureDirectory(sessionToken: string, parentID: number, name: string): Promise<number> {
    // Prefer not to create; only verify existence to avoid 404s
    const existing = (await this.listChildren(sessionToken, parentID)).find((n) => n.dir && n.name === name);
    if (existing) return existing.id;
    // Directory not visible yet
    return Promise.reject(new Error(`STACK directory not found under parent ${parentID}: ${name}`));
  }

  private async uploadFile(sessionToken: string, parentID: number, filename: string, content: Buffer): Promise<number> {
    const resp = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers: {
        "x-sessiontoken": sessionToken,
        "x-filebytesize": content.length.toString(),
        "x-parentid": parentID.toString(),
        "x-filename": Buffer.from(filename).toString("base64"),
        "x-overwrite": "true",
        "Content-Type": "application/octet-stream",
        // Leave Content-Length to be set by the runtime
      },
      // Use Blob for BodyInit to satisfy TS in web fetch types
      body: new Blob([content], { type: "application/octet-stream" }),
    });
    if (!resp.ok) throw new Error(`STACK upload failed (${resp.status})`);
    const idHeader = resp.headers.get("x-id");
    if (!idHeader) throw new Error("STACK upload: missing node id");
    return parseInt(idHeader, 10);
  }

  private async startUploadSession(
    sessionToken: string,
    parentID: number,
    filename: string,
    totalSize: number,
    chunkSize: number
  ): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/upload/session/start`, {
      method: "POST",
      headers: {
        "x-sessiontoken": sessionToken,
        "x-filebytesize": totalSize.toString(),
        "x-chunkbytesize": chunkSize.toString(),
        "x-parentid": parentID.toString(),
        "x-filename": Buffer.from(filename).toString("base64"),
      },
    });
    if (!resp.ok) throw new Error(`STACK start session failed (${resp.status})`);
    const sessionId = resp.headers.get("x-sessionid");
    if (!sessionId) throw new Error("STACK start session: missing session id");
    return sessionId;
  }

  private async appendUploadChunk(
    sessionToken: string,
    sessionId: string,
    startOffset: number,
    chunk: Buffer
  ): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/upload/session/append`, {
      method: "POST",
      headers: {
        "x-sessiontoken": sessionToken,
        "x-sessionid": sessionId,
        "x-startoffset": startOffset.toString(),
        "Content-Type": "application/octet-stream",
        // Let runtime compute Content-Length
      },
      body: new Blob([chunk], { type: "application/octet-stream" }),
    });
    if (resp.status !== 201) {
      const text = await resp.text().catch(() => "");
      throw new Error(`STACK append failed (${resp.status}): ${text || resp.statusText}`);
    }
  }

  // Public helpers wrapping private methods
  async listChildrenByParentId(parentID: number): Promise<Array<{ id: number; name: string; dir: boolean }>> {
    const sessionToken = await this.authenticate();
    return await this.listChildren(sessionToken, parentID);
  }

  async listChildrenByRelativeDir(relativeDirPath: string): Promise<Array<{ id: number; name: string; dir: boolean }>> {
    const dirId = await this.getDirectoryNodeIdByRelativePath(relativeDirPath);
    if (!dirId) return [];
    return await this.listChildrenByParentId(dirId);
  }

  async deleteOtherFilesInDir(relativeDirPath: string, keepNodeId: number): Promise<void> {
    const children = await this.listChildrenByRelativeDir(relativeDirPath);
    for (const child of children) {
      if (!child.dir && child.id !== keepNodeId) {
        await this.deleteNode(child.id);
      }
    }
  }

  async uploadLargeFileWithSession(
    relativeDirParts: string[],
    filename: string,
    readChunk: (start: number, chunkSize: number) => Promise<Buffer | null>,
    totalSize: number,
    chunkSize: number
  ): Promise<number> {
    const sessionToken = await this.authenticate();
    let parentId = await this.getFilesRoot(sessionToken);
    for (const part of relativeDirParts) {
      parentId = await this.ensureDirectory(sessionToken, parentId, part);
    }
    const sessionId = await this.startUploadSession(sessionToken, parentId, filename, totalSize, chunkSize);
    let offset = 0;
    while (offset < totalSize) {
      const chunk = await readChunk(offset, chunkSize);
      if (!chunk || chunk.length === 0) break;
      await this.appendUploadChunk(sessionToken, sessionId, offset, chunk);
      offset += chunk.length;
    }

    // After completion, look up node by filename to obtain nodeId
    const nodes = await this.listChildren(sessionToken, parentId);
    const node = nodes.find((n) => !n.dir && n.name === filename);
    if (!node) throw new Error("STACK: uploaded file not found after session completion");
    return node.id;
  }

  private async createPublicShare(sessionToken: string, nodeId: number): Promise<{ urlToken: string }> {
    const resp = await fetch(`${this.baseUrl}/node-shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
      body: JSON.stringify({ nodeId, type: "Public", password: "" }),
    });
    if (resp.status !== 201) {
      const text = await resp.text().catch(() => "");
      throw new Error(`STACK create share failed (${resp.status}): ${text || resp.statusText}`);
    }
    const token = resp.headers.get("x-urltoken");
    const shareIdHeader = resp.headers.get("x-shareid");
    if (!token) throw new Error("STACK create share: missing x-urltoken header");
    // Ensure no password is required by clearing password if present
    if (shareIdHeader) {
      const shareId = parseInt(shareIdHeader, 10);
      if (!Number.isNaN(shareId)) {
        await this.updateShare(sessionToken, shareId, {
          removePassword: true,
          permissions: { readFile: true, readDirectory: true, createFile: false, createDirectory: false, updateFile: false, updateDirectory: false, deleteFile: false, deleteDirectory: false },
        });
      }
    }
    return { urlToken: token };
  }

  private async updateShare(sessionToken: string, shareId: number, body: Record<string, unknown>): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/node-shares/${shareId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
      body: JSON.stringify(body),
    });
    if (resp.status !== 204) {
      const text = await resp.text().catch(() => "");
      throw new Error(`STACK update share failed (${resp.status}): ${text || resp.statusText}`);
    }
  }

  async getDirectoryNodeIdByRelativePath(relativeDirPath: string): Promise<number | null> {
    const sessionToken = await this.authenticate();
    let parentId = await this.getFilesRoot(sessionToken);
    const parts = relativeDirPath.split("/").filter(Boolean);
    for (const part of parts) {
      const children = await this.listChildren(sessionToken, parentId);
      const next = children.find((n) => n.dir && n.name === part);
      if (!next) {
        return null;
      }
      parentId = next.id;
    }
    return parentId;
  }

  async getNodeIdByPath(pathUnderFiles: string): Promise<number | null> {
    const sessionToken = await this.authenticate();
    const url = `${this.baseUrl}/node-id?path=${encodeURIComponent(pathUnderFiles)}`;
    const resp = await fetch(url, { headers: { "x-sessiontoken": sessionToken } });
    
    if (resp.status === 204) {
      const idHeader = resp.headers.get("x-id");
      return idHeader ? parseInt(idHeader, 10) : null;
    } else if (resp.status === 404) return null;

    if (!resp.ok) throw new Error(`STACK get node by path failed (${resp.status})`);
    return null;
  }

  private async deleteNodeInternal(sessionToken: string, nodeId: number): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/nodes/${nodeId}`, {
      method: "DELETE",
      headers: { "x-sessiontoken": sessionToken },
    });
    if (resp.status === 204 || resp.status === 404) return; // ok if already gone
    if (!resp.ok) throw new Error(`STACK delete node failed (${resp.status})`);
  }

  async deleteNode(nodeId: number): Promise<void> {
    const sessionToken = await this.authenticate();
    await this.deleteNodeInternal(sessionToken, nodeId);
  }

  private buildShareBaseUrl(): string {
    const configuredBase = process.env.STACK_SHARE_BASE_URL;
    if (configuredBase) return configuredBase.replace(/\/$/, "");

    const configuredHost = process.env.STACK_SHARE_HOST || SETTINGS.stack.shareHost;
    try {
      const parsed = new URL(this.baseUrl);
      const protocol = parsed.protocol || "https:";
      if (configuredHost) {
        return `${protocol}//${configuredHost.replace(/\/$/, "")}/s`;
      }
      return `${protocol}//${parsed.host}/s`;
    } catch {
      if (configuredHost) return `https://${configuredHost.replace(/\/$/, "")}/s`;
      return "/s";
    }
  }

  async getNodeIdByRelativePath(relativePath: string): Promise<number | null> {
    const sessionToken = await this.authenticate();
    let parentId = await this.getFilesRoot(sessionToken);
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return null;
    for (const part of parts) {
      const children = await this.listChildren(sessionToken, parentId);
      const next = children.find((n) => n.dir && n.name === part);
      if (!next) {
        return null; // directory chain does not exist (yet)
      }
      parentId = next.id;
    }
    const child = (await this.listChildren(sessionToken, parentId)).find((n) => !n.dir && n.name === fileName);
    return child?.id ?? null;
  }

  async shareNode(nodeId: number): Promise<string> {
    const sessionToken = await this.authenticate();
    const { urlToken } = await this.createPublicShare(sessionToken, nodeId);
    const base = this.buildShareBaseUrl();
    return `${base}/${urlToken}`;
  }

  async uploadAndShareByRelativePath(relativePath: string, content: Buffer): Promise<string> {
    const sessionToken = await this.authenticate();
    let parentId = await this.getFilesRoot(sessionToken);
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) throw new Error("Invalid relative path");
    for (const part of parts) {
      parentId = await this.ensureDirectory(sessionToken, parentId, part);
    }
    const nodeId = await this.uploadFile(sessionToken, parentId, fileName, content);
    const { urlToken } = await this.createPublicShare(sessionToken, nodeId);
    const base = this.buildShareBaseUrl();
    return `${base}/${urlToken}`;
  }
}
