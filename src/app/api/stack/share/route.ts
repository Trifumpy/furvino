import { NextRequest, NextResponse } from "next/server";
import { loadEnv } from "@/utils/loadEnvConfig";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type ApiResponse = {
  success: boolean;
  shareUrl?: string;
  error?: string;
};

type MeResponse = {
  filesNodeID: number;
};

type ListNodeResponse = {
  nodes: { id: number; name: string; dir: boolean }[];
};

type CreateDirResponse = {
  id: number;
};

type CreateShareResponse = {
  urlToken: string;
};

export async function POST(req: NextRequest) {
  try {
    // Ensure .env.local is loaded in dev
    loadEnv();
    const { filePath } = (await req.json()) as { filePath?: string };
    console.log("[STACK] API called with filePath:", filePath);

    if (!filePath) {
      return NextResponse.json<ApiResponse>({ success: false, error: "No filePath provided" }, { status: 400 });
    }

    const baseDir = process.env.STACK_WATCH_DIR || "/home/trifumpy/stack/furvino/novels"; //CHANGE
    console.log("[STACK] baseDir:", baseDir);
    if (!filePath.startsWith(baseDir)) {
      console.warn("[STACK] Rejecting file outside baseDir", { baseDir, filePath });
      return NextResponse.json<ApiResponse>(
        { success: false, error: "File not in novels directory or subfolders" },
        { status: 400 }
      );
    }

    let fileContent: Buffer;
    try {
      fileContent = await fs.readFile(filePath);
    } catch (err) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Failed to read file: ${(err as Error).message}` },
        { status: 500 }
      );
    }

    const relativePath = filePath.slice(baseDir.length + 1);
    const filename = path.basename(relativePath);
    const dirname = path.dirname(relativePath);

    const baseUrl = process.env.STACK_API_URL;
    const username = process.env.STACK_USERNAME;
    const password = process.env.STACK_PASSWORD;
    const shareBaseUrlEnv = process.env.STACK_SHARE_BASE_URL; // optional override, e.g. https://tenant.stackstorage.com/s

    if (!baseUrl || !username || !password) {
      console.error("[STACK] Missing envs", {
        STACK_API_URL: !!baseUrl,
        STACK_USERNAME: !!username,
        STACK_PASSWORD: !!password,
      });
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing STACK_API_URL, STACK_USERNAME or STACK_PASSWORD in environment variables" },
        { status: 500 }
      );
    }

    // 1) Authenticate
    const authResponse = await fetch(`${baseUrl}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authResponse.ok) {
      const txt = await authResponse.text().catch(() => "");
      console.error("[STACK] Authentication failed", authResponse.status, txt || authResponse.statusText);
      return NextResponse.json<ApiResponse>({ success: false, error: `Authentication failed: ${txt || authResponse.statusText}` }, { status: authResponse.status });
    }

    const sessionToken = authResponse.headers.get("x-sessiontoken") ?? undefined;
    const is2FARequired = authResponse.headers.get("x-2fa-required") === "true";

    if (is2FARequired) {
      return NextResponse.json<ApiResponse>({ success: false, error: "2FA is required but not handled" }, { status: 412 });
    }

    if (!sessionToken) {
      return NextResponse.json<ApiResponse>({ success: false, error: "No session token received" }, { status: 401 });
    }

    // 2) Get filesNodeID
    const meResponse = await fetch(`${baseUrl}/me`, {
      headers: { "x-sessiontoken": sessionToken },
    });
    if (!meResponse.ok) {
      const txt = await meResponse.text().catch(() => "");
      console.error("[STACK] /me failed", meResponse.status, txt || meResponse.statusText);
      return NextResponse.json<ApiResponse>({ success: false, error: `Failed to fetch user info: ${txt || meResponse.statusText}` }, { status: meResponse.status });
    }
    const meData = (await meResponse.json()) as MeResponse;
    let currentParentId = meData.filesNodeID;

    // 3) Create folder structure if needed
    const dirs = dirname.split("/").filter(Boolean);
    for (const dir of dirs) {
      const listResponse = await fetch(`${baseUrl}/node?parentID=${currentParentId}&limit=100`, {
        headers: { "x-sessiontoken": sessionToken },
      });
      if (!listResponse.ok) {
        const txt = await listResponse.text().catch(() => "");
        console.error("[STACK] list nodes failed", listResponse.status, txt || listResponse.statusText);
        return NextResponse.json<ApiResponse>({ success: false, error: `Failed to list nodes: ${txt || listResponse.statusText}` }, { status: listResponse.status });
      }
      const listData = (await listResponse.json()) as ListNodeResponse;
      const existingDir = listData.nodes.find((n) => n.name === dir && n.dir);
      if (existingDir) {
        currentParentId = existingDir.id;
      } else {
        const createDirResponse = await fetch(`${baseUrl}/node`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
          body: JSON.stringify({ parentID: currentParentId, name: dir }),
        });
        if (!createDirResponse.ok) {
          const txt = await createDirResponse.text().catch(() => "");
          console.error("[STACK] create directory failed", createDirResponse.status, txt || createDirResponse.statusText);
          return NextResponse.json<ApiResponse>(
            { success: false, error: `Failed to create directory: ${txt || createDirResponse.statusText}` },
            { status: createDirResponse.status }
          );
        }
        const newDirData = (await createDirResponse.json()) as CreateDirResponse;
        currentParentId = newDirData.id;
      }
    }

    // 4) Upload the file
    const fileSize = fileContent.length;
    const base64Filename = Buffer.from(filename).toString("base64");

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: {
        "x-sessiontoken": sessionToken,
        "x-filebytesize": fileSize.toString(),
        "x-parentid": currentParentId.toString(),
        "x-filename": base64Filename,
        "x-overwrite": "false",
      },
      body: fileContent,
    });
    if (!uploadResponse.ok) {
      const txt = await uploadResponse.text().catch(() => "");
      console.error("[STACK] upload failed", uploadResponse.status, txt || uploadResponse.statusText);
      return NextResponse.json<ApiResponse>({ success: false, error: `File upload failed: ${txt || uploadResponse.statusText}` }, { status: uploadResponse.status });
    }
    const nodeId = uploadResponse.headers.get("x-id");
    if (!nodeId) {
      return NextResponse.json<ApiResponse>({ success: false, error: "No node ID returned after upload" }, { status: 500 });
    }

    // 5) Create public share
    const shareResponse = await fetch(`${baseUrl}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sessiontoken": sessionToken },
      body: JSON.stringify({ nodeId: parseInt(nodeId, 10), type: "Public" }),
    });
    if (!shareResponse.ok) {
      const txt = await shareResponse.text().catch(() => "");
      console.error("[STACK] create share failed", shareResponse.status, txt || shareResponse.statusText);
      return NextResponse.json<ApiResponse>({ success: false, error: `Failed to create public share: ${txt || shareResponse.statusText}` }, { status: shareResponse.status });
    }
    const shareData = (await shareResponse.json()) as CreateShareResponse;

    let shareBaseUrl = shareBaseUrlEnv;
    if (!shareBaseUrl) {
      try {
        const parsed = new URL(baseUrl);
        // e.g., https://tenant.stackstorage.com/api/v2 -> https://tenant.stackstorage.com/s
        shareBaseUrl = `${parsed.protocol}//${parsed.host}/s`;
      } catch {
        // Fallback if STACK_API_URL is not a valid URL
        shareBaseUrl = "/s";
      }
    }
    const shareUrl = `${shareBaseUrl.replace(/\/$/, "")}/${shareData.urlToken}`;

    console.log("[STACK] share created", shareUrl);
    return NextResponse.json<ApiResponse>({ success: true, shareUrl });
  } catch (error) {
    console.error("[STACK] API unhandled error", error);
    return NextResponse.json<ApiResponse>({ success: false, error: (error as Error).message }, { status: 500 });
  }
}