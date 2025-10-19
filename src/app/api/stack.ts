import { SETTINGS } from "./settings";

/**
 * StackService handles backend-only integration with STACK API.
 * Credentials are kept server-side only and never exposed to the frontend.
 * Used for creating shares and managing files after WebDAV uploads.
 */
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

  private async createPublicShare(sessionToken: string, nodeId: number): Promise<{ urlToken: string; shareId?: number }> {
    const resp = await fetch(`${this.baseUrl}/node-shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
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
    if (resp.status !== 201) {
      const text = await resp.text().catch(() => "");
      throw new Error(`STACK create share failed (${resp.status}): ${text || resp.statusText}`);
    }
    const token = resp.headers.get("x-urltoken");
    const shareIdHeader = resp.headers.get("x-shareid");

    if (!token) throw new Error("STACK create share: missing x-urltoken header");

    const shareId = shareIdHeader ? parseInt(shareIdHeader, 10) : undefined;

    return { urlToken: token, shareId };
  }

  private buildShareBaseUrl(): string {
    const configuredBase = process.env.STACK_SHARE_BASE_URL;
    if (configuredBase) return configuredBase.replace(/\/$/, "");

    const configuredHost = process.env.STACK_SHARE_HOST || SETTINGS.stack.shareHost;
    try {
      const protocol = "https:";
      if (configuredHost) {
        return `${protocol}//${configuredHost.replace(/\/$/, "")}/s`;
      }
      return "/s";
    } catch {
      if (configuredHost) return `https://${configuredHost.replace(/\/$/, "")}/s`;
      return "/s";
    }
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

  async shareNode(nodeId: number): Promise<string> {
    const sessionToken = await this.authenticate();
    const { urlToken } = await this.createPublicShare(sessionToken, nodeId);
    const base = this.buildShareBaseUrl();
    return `${base}/${urlToken}`;
  }
}
