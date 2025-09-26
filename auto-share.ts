// pages/api/upload-and-share.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { Buffer } from 'buffer';
import { SETTINGS } from '@/app/api/settings';

interface ApiResponse {
  success: boolean;
  shareUrl?: string;
  error?: string;
}

interface AuthResponseHeaders {
  'x-sessiontoken'?: string;
  'x-2fa-required'?: string;
}

interface MeResponse {
  filesNodeID: number;
}

interface ListNodeResponse {
  nodes: { id: number; name: string; dir: boolean }[];
}

interface CreateDirResponse {
  id: number;
}

interface UploadResponseHeaders {
  'x-id'?: string;
}

interface CreateShareResponse {
  urlToken: string;
}

export default async function POST(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { filePath } = req.body as { filePath: string };

  if (!filePath) {
    return res.status(400).json({ success: false, error: 'No filePath provided' });
  }

  const baseDir = '/home/github/STACK/furvino/novels';
  if (!filePath.startsWith(baseDir)) {
    return res.status(400).json({ success: false, error: 'File not in novels directory or subfolders' });
  }

  let fileContent: Buffer;
  try {
    fileContent = await fs.readFile(filePath);
  } catch (err) {
    return res.status(500).json({ success: false, error: `Failed to read file: ${(err as Error).message}` });
  }

  const relativePath = filePath.slice(baseDir.length + 1); // +1 for the trailing slash
  const filename = path.basename(relativePath);
  const dirname = path.dirname(relativePath);

  const baseUrl =  SETTINGS.stack.apiUrl;
  const username = SETTINGS.stack.username;
  const password = SETTINGS.stack.password;

  if (!username || !password) {
    return res.status(500).json({ success: false, error: 'Missing STACK_USERNAME or STACK_PASSWORD in environment variables' });
  }

  // Step 1: Authenticate
  const authResponse = await fetch(`${baseUrl}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!authResponse.ok) {
    return res.status(authResponse.status).json({ success: false, error: 'Authentication failed' });
  }

  const sessionToken = authResponse.headers.get('x-sessiontoken') as string | undefined;
  const is2FARequired = authResponse.headers.get('x-2fa-required') === 'true';

  if (is2FARequired) {
    return res.status(412).json({ success: false, error: '2FA is required but not handled in this script' });
  }

  if (!sessionToken) {
    return res.status(401).json({ success: false, error: 'No session token received' });
  }

  // Step 2: Get filesNodeID from /me
  const meResponse = await fetch(`${baseUrl}/me`, {
    headers: { 'x-sessiontoken': sessionToken },
  });

  if (!meResponse.ok) {
    return res.status(meResponse.status).json({ success: false, error: 'Failed to fetch user info' });
  }

  const meData = (await meResponse.json()) as MeResponse;
  let currentParentId = meData.filesNodeID;

  // Step 3: Create folder structure if needed
  const dirs = dirname.split('/').filter((d) => d);
  for (const dir of dirs) {
    // List children to check if dir exists
    const listResponse = await fetch(`${baseUrl}/node?parentID=${currentParentId}&limit=100`, {
      headers: { 'x-sessiontoken': sessionToken },
    });

    if (!listResponse.ok) {
      return res.status(listResponse.status).json({ success: false, error: 'Failed to list nodes' });
    }

    const listData = (await listResponse.json()) as ListNodeResponse;
    const existingDir = listData.nodes.find((n) => n.name === dir && n.dir);

    if (existingDir) {
      currentParentId = existingDir.id;
    } else {
      // Create new directory
      const createDirResponse = await fetch(`${baseUrl}/node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sessiontoken': sessionToken },
        body: JSON.stringify({ parentID: currentParentId, name: dir }),
      });

      if (!createDirResponse.ok) {
        return res.status(createDirResponse.status).json({ success: false, error: 'Failed to create directory' });
      }

      const newDirData = (await createDirResponse.json()) as CreateDirResponse;
      currentParentId = newDirData.id;
    }
  }

  // Step 4: Upload the file
  const fileSize = fileContent.length;
  const base64Filename = Buffer.from(filename).toString('base64');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: {
      'x-sessiontoken': sessionToken,
      'x-filebytesize': fileSize.toString(),
      'x-parentid': currentParentId.toString(),
      'x-filename': base64Filename,
      'x-overwrite': 'false',
      'Content-Type': 'application/octet-stream',
    },
    // Use a Blob to satisfy Web Fetch BodyInit types in Node runtimes
    body: new Blob([fileContent]),
  });

  if (!uploadResponse.ok) {
    return res.status(uploadResponse.status).json({ success: false, error: 'File upload failed' });
  }

  const nodeId = uploadResponse.headers.get('x-id');
  if (!nodeId) {
    return res.status(500).json({ success: false, error: 'No node ID returned after upload' });
  }

  // Step 5: Create public share
  const shareResponse = await fetch(`${baseUrl}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sessiontoken': sessionToken },
    body: JSON.stringify({
      nodeId: parseInt(nodeId, 10),
      type: 'Public',
    }),
  });

  if (!shareResponse.ok) {
    return res.status(shareResponse.status).json({ success: false, error: 'Failed to create public share' });
  }

  const shareData = (await shareResponse.json()) as CreateShareResponse;
  const shareUrl = `https://tomikolasek.stackstorage.com/s/${shareData.urlToken}`;

  return res.status(200).json({ success: true, shareUrl });
}