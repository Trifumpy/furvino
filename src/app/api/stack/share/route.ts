import { NextRequest, NextResponse } from "next/server";
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
    const { filePath } = (await req.json()) as { filePath?: string };

    if (!filePath) {
      return NextResponse.json<ApiResponse>({ success: false, error: "No filePath provided" }, { status: 400 });
    }

    const baseDir = "/home/github/STACK/furvino/novels";
    if (!filePath.startsWith(baseDir)) {
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
      return NextResponse.json<ApiResponse>({ success: false, error: "Authentication failed" }, { status: authResponse.status });
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
      return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch user info" }, { status: meResponse.status });
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
        return NextResponse.json<ApiResponse>({ success: false, error: "Failed to list nodes" }, { status: listResponse.status });
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
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Failed to create directory" },
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
      return NextResponse.json<ApiResponse>({ success: false, error: "File upload failed" }, { status: uploadResponse.status });
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
      return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create public share" }, { status: shareResponse.status });
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

    return NextResponse.json<ApiResponse>({ success: true, shareUrl });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


