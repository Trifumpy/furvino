import { SETTINGS } from "@/app/api/settings";

export class StackService {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
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
    if (!resp.ok) throw new Error(`STACK list nodes failed (${resp.status})`);
    const data = (await resp.json()) as { nodes: { id: number; name: string; dir: boolean }[] };
    return data.nodes;
  }

  private async ensureDirectory(sessionToken: string, parentID: number, name: string): Promise<number> {
    const existing = (await this.listChildren(sessionToken, parentID)).find((n) => n.dir && n.name === name);
    if (existing) return existing.id;
    const resp = await fetch(`${this.baseUrl}/node`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
      body: JSON.stringify({ parentID, name }),
    });
    if (!resp.ok) throw new Error(`STACK create directory failed (${resp.status})`);
    const data = (await resp.json()) as { id: number };
    return data.id;
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
      },
      body: content,
    });
    if (!resp.ok) throw new Error(`STACK upload failed (${resp.status})`);
    const idHeader = resp.headers.get("x-id");
    if (!idHeader) throw new Error("STACK upload: missing node id");
    return parseInt(idHeader, 10);
  }

  private async createPublicShare(sessionToken: string, nodeId: number): Promise<{ urlToken: string }> {
    const resp = await fetch(`${this.baseUrl}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
      body: JSON.stringify({ nodeId, type: "Public" }),
    });
    if (!resp.ok) throw new Error(`STACK create share failed (${resp.status})`);
    return (await resp.json()) as { urlToken: string };
  }

  private buildShareBaseUrl(): string {
    const configured = process.env.STACK_SHARE_BASE_URL;
    if (configured) return configured.replace(/\/$/, "");
    try {
      const parsed = new URL(this.baseUrl);
      return `${parsed.protocol}//${parsed.host}/s`;
    } catch {
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
      parentId = await this.ensureDirectory(sessionToken, parentId, part);
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


