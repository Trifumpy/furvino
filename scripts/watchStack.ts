import * as dotenv from 'dotenv';
import axios from 'axios';
import path from 'node:path';
import chokidar from 'chokidar';
import fs from 'fs';

// Load environment variables from .env.local
const result = dotenv.config({ path: '.env.local' });
if (result.error) {
  console.error('[STACK] Error loading .env.local:', result.error);
  process.exit(1);
}

console.log('[STACK] Environment variables loaded from .env.local');

// Validate required environment variables
const requiredEnvVars = {
  STACK_API_URL: process.env.STACK_API_URL,
  STACK_APP_TOKEN: process.env.STACK_APP_TOKEN,
  WATCH_ROOT: process.env.WATCH_ROOT,
  STACK_PREFIX: process.env.STACK_PREFIX,
  STACK_SHARE_HOST: process.env.STACK_SHARE_HOST
};

// Check for missing or invalid values
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value === '<from x-apptoken>' || value === 'undefined') {
    console.error(`[STACK] ERROR: Missing or invalid ${key} in environment variables`);
    console.error(`[STACK] Current value: ${value}`);
    console.error(`[STACK] Please check your .env.local file`);
    process.exit(1);
  }
}

const BASE = (process.env.STACK_API_URL ?? '').replace(/\/+$/,'');
const api = axios.create({
  baseURL: BASE,
  headers: { 'X-AppToken': process.env.STACK_APP_TOKEN!, 'Accept': 'application/json' },
  timeout: 30_000,
});

const WATCH_ROOT    = process.env.WATCH_ROOT    ?? '/home/trifumpy/STACK/furvino/novels';
const STACK_PREFIX  = process.env.STACK_PREFIX  ?? 'files/furvino/novels';
const SHARE_HOST    = process.env.STACK_SHARE_HOST    ?? 'tomikolasek.stackstorage.com';
const PREVIEW_BASE  = (process.env.STACK_PREVIEW_BASE 
  || process.env.PUBLIC_BASE_URL 
  || process.env.NEXT_PUBLIC_SITE_URL 
  || 'http://localhost:3000').replace(/\/+$/,'');

// Retry configuration (tuned for slow STACK mounts)
const RETRY_BASE_MS = Number(process.env.STACK_RETRY_BASE_MS ?? 5000); // 5s default
const RETRY_MAX_ATTEMPTS = Number(process.env.STACK_RETRY_MAX_ATTEMPTS ?? 120); // up to ~10min default
const SHARE_RETRY_ATTEMPTS = Number(process.env.STACK_SHARE_RETRY_ATTEMPTS ?? 5); // share creation retries
const SHARE_RETRY_BASE_MS = Number(process.env.STACK_SHARE_RETRY_BASE_MS ?? 5000);
// Re-detection configuration
const REDETECT_MAX_ATTEMPTS = Number(process.env.STACK_REDETECT_MAX_ATTEMPTS ?? 5);
const REDETECT_DELAY_MS = Number(process.env.STACK_REDETECT_DELAY_MS ?? 10000);

console.log(`[STACK] Configuration loaded:`);
console.log(`[STACK]   API URL: ${BASE}`);
console.log(`[STACK]   Watch Root: ${WATCH_ROOT}`);
console.log(`[STACK]   Stack Prefix: ${STACK_PREFIX}`);
console.log(`[STACK]   Share Host: ${SHARE_HOST}`);
console.log(`[STACK]   Preview Base: ${PREVIEW_BASE}`);
console.log(`[STACK]   Retry Base (ms): ${RETRY_BASE_MS}`);
console.log(`[STACK]   Retry Attempts: ${RETRY_MAX_ATTEMPTS}`);
console.log(`[STACK]   Share Retry Base (ms): ${SHARE_RETRY_BASE_MS}`);
console.log(`[STACK]   Share Retry Attempts: ${SHARE_RETRY_ATTEMPTS}`);
console.log(`[STACK]   Redetect Delay (ms): ${REDETECT_DELAY_MS}`);
console.log(`[STACK]   Redetect Attempts: ${REDETECT_MAX_ATTEMPTS}`);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function toStackPath(localPath: string) {
  const rel = path.relative(WATCH_ROOT, localPath).split(path.sep).join('/');
  return `${STACK_PREFIX}/${rel}`;
}

async function uploadFileToStack(localPath: string) {
  const stackPath = toStackPath(localPath);
  const dirPath = path.dirname(stackPath);
  const fileName = path.basename(stackPath);
  
  console.log(`[STACK] Uploading ${localPath} to ${stackPath}`);
  
  // Skipping directory creation by request. We will try to resolve an existing parent, otherwise use root.
  
  // Upload the file using STACK's upload API
  const fileBuffer = fs.readFileSync(localPath);
  const fileNameBase64 = Buffer.from(fileName).toString('base64');
  
  // Resolve parent directory ID if it exists; otherwise fallback to STACK_PREFIX root or 0
  let parentId = 0; // Default to root
  try {
    const dirResponse = await api.get('/node-id', { 
      params: { path: dirPath }, 
      validateStatus: (s: number) => s === 204 
    });
    parentId = Number(dirResponse.headers['x-id']);
    console.log(`[STACK] Using parent directory ID: ${parentId}`);
  } catch {}
  if (!parentId) {
    try {
      const prefixRes = await api.get('/node-id', {
        params: { path: STACK_PREFIX },
        validateStatus: (s: number) => s === 204
      });
      parentId = Number(prefixRes.headers['x-id']);
      if (parentId) {
        console.log(`[STACK] Using STACK_PREFIX as parent ID: ${parentId}`);
      }
    } catch {}
  }
  if (!parentId) {
    console.warn(`[STACK] No existing parent found for ${dirPath}. Uploading to root (0).`);
  }
  
  // Check if file already exists
  try {
    const existingFileResponse = await api.get('/node-id', { 
      params: { path: stackPath }, 
      validateStatus: (s: number) => s === 204 
    });
    const existingNodeId = Number(existingFileResponse.headers['x-id']);
    console.log(`[STACK] File already exists with node ID: ${existingNodeId}`);
    return existingNodeId;
  } catch {
    console.log(`[STACK] File does not exist, proceeding with upload`);
  }
  
  try {
    const uploadResponse = await api.post('/upload', fileBuffer, {
      headers: {
        'X-FileByteSize': fileBuffer.length.toString(),
        'X-ParentID': parentId.toString(),
        'X-Filename': fileNameBase64,
        'X-Overwrite': 'true', // Allow overwriting if file exists
        'Content-Type': 'application/octet-stream',
      },
      validateStatus: (s: number) => s === 201
    });
    
    const nodeId = uploadResponse.headers['x-id'];
    console.log(`[STACK] File uploaded with node ID: ${nodeId}`);
    
    return nodeId;
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: unknown; headers?: unknown } };
    console.error(`[STACK] Upload failed with status: ${err.response?.status}`);
    console.error(`[STACK] Response data:`, err.response?.data);
    console.error(`[STACK] Response headers:`, err.response?.headers);
    throw e;
  }
}

async function ensureNodeIndexed(stackPath: string, expectedId: number, tries = RETRY_MAX_ATTEMPTS) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await api.get('/node-id', {
        params: { path: stackPath },
        validateStatus: (s: number) => s === 204,
      });
      const id = Number(res.headers['x-id']);
      if (id === expectedId) return;
    } catch {}
    const delay = Math.min(RETRY_BASE_MS + i * 500, RETRY_BASE_MS * 6);
    if (i % 10 === 0) console.log(`[STACK] Waiting for indexing of ${stackPath} (attempt ${i + 1}/${tries})`);
    await sleep(delay);
  }
  throw new Error(`Node not indexed yet for path: ${stackPath}`);
}

async function getOrCreatePublicShare(nodeId: number) {
  const maxAttempts = SHARE_RETRY_ATTEMPTS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[STACK] [share attempt ${attempt}/${maxAttempts}] Checking existing shares for node ${nodeId}`);
      const list = await api.get('/node-shares', { params: { nodeID: nodeId, type: 'Public' } });
      const existing = list.data?.shares?.[0];
      if (existing?.urlToken) {
        try {
          const shareInfo = await api.get(`/node-shares/${existing.id}`);
          if (shareInfo.data?.hasPassword === false) {
            const token = String(existing.urlToken);
            console.log(`[STACK] Reusing existing public share for node ${nodeId} (share ${existing.id})`);
            return token;
          }
          await api.delete(`/node-shares/${existing.id}`, { validateStatus: (s: number) => s === 204 });
        } catch {}
      }

      console.log(`[STACK] [share attempt ${attempt}/${maxAttempts}] Creating new public share for node ${nodeId}`);
      const res = await api.post('/node-shares', {
        nodeId,
        type: 'Public',
        permissions: {
          readFile: true,
          readDirectory: true,
          createFile: false,
          createDirectory: false,
          updateFile: false,
          updateDirectory: false,
          deleteFile: false,
          deleteDirectory: false,
        },
      }, { validateStatus: (s: number) => s === 201 });

      const urlToken = String(res.headers['x-urltoken']);
      return urlToken;
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { response?: { status?: number } })?.response?.status ?? 0;
      if (status === 400 || status === 404 || status === 412 || status === 423 || status === 409) {
        const delay = Math.min(SHARE_RETRY_BASE_MS + attempt * 1000, SHARE_RETRY_BASE_MS * 12);
        console.warn(`[STACK] Share attempt ${attempt} failed with status ${status}. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function shareLocalFile(localPath: string) {
  try {
    // First upload the file to STACK
    const nodeId = await uploadFileToStack(localPath);
    const stackPath = toStackPath(localPath);
    try {
      await ensureNodeIndexed(stackPath, Number(nodeId));
    } catch {}
    
    // Then create or get existing public share
    const urlToken = await getOrCreatePublicShare(nodeId);
    
    // Determine if this is a media file that should get a preview link
    const fileName = path.basename(localPath);
    const fileExt = path.extname(fileName).toLowerCase();
  const isImage = isImageFileType(fileExt);
    
    let link: string;
  if (isImage) {
      // Server-side preview via VPS with CSRF token embedded in the link (no AppToken exposed)
      const csrfToken = await getCsrfToken();
      link = `${PREVIEW_BASE}/api/stack/preview?t=${urlToken}&id=${nodeId}&h=2000&csrf=${encodeURIComponent(csrfToken)}`;
      console.log(`[STACK] Shared ${localPath} → ${link} (server-side preview w/ CSRF)`);
    } else {
      // Create direct download link for non-media files
      link = `https://${SHARE_HOST}/s/${urlToken}`;
      console.log(`[STACK] Shared ${localPath} → ${link} (download link)`);
    }
    
    return link;
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } };
    console.error('[STACK] Error in shareLocalFile:', err.response?.data || (error as Error).message);
    throw error;
  }
}

async function getCsrfToken(): Promise<string> {
  const res = await api.get('/authenticate/csrf-token', {
    validateStatus: (s: number) => s === 200,
  });
  const token = res.headers['x-csrf-token'];
  if (!token) {
    throw new Error('No CSRF token in response headers');
  }
  return String(token);
}

// Helper function to determine if a file is an image type that supports previews
function isImageFileType(fileExt: string): boolean {
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'
  ];
  return imageExtensions.includes(fileExt);
}

// Watcher setup
console.log(`[STACK] Starting watcher for: ${WATCH_ROOT}`);

if (!fs.existsSync(WATCH_ROOT)) {
  console.warn(`[STACK] Watch directory does not exist: ${WATCH_ROOT}`);
}

const watcher = chokidar.watch(WATCH_ROOT, {
  usePolling: true,
  ignoreInitial: false,
  followSymlinks: true,
  awaitWriteFinish: {
    stabilityThreshold: 5000,
    pollInterval: 1000
  }
});

watcher.on('all', (event, path) => {
  console.log(`[STACK] ${event}: ${path}`);
});

async function shareWithRetries(filePath: string, attempts = RETRY_MAX_ATTEMPTS) {
  for (let i = 1; i <= attempts; i++) {
    if (!fileExists(filePath)) {
      console.warn(`[STACK] File no longer exists, aborting share: ${filePath}`);
      return;
    }
    try {
      const link = await shareLocalFile(filePath);
      console.log(`[STACK] Share link created: ${link}`);
      return link;
    } catch (err: unknown) {
      if (!fileExists(filePath)) {
        console.warn(`[STACK] File disappeared during retries, aborting: ${filePath}`);
        return;
      }
      const status = (err as { response?: { status?: number } })?.response?.status ?? 0;
      const delay = Math.min(RETRY_BASE_MS + i * 1000, RETRY_BASE_MS * 12);
      console.warn(`[STACK] shareLocalFile attempt ${i}/${attempts} failed${status ? ` (status ${status})` : ''}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Failed to create share link after multiple attempts');
}

watcher.on('add', async (filePath) => {
  console.log(`[STACK] New file detected: ${filePath}`);
  try {
    const link = await shareWithRetries(filePath);
    if (!link) {
      console.warn(`[STACK] Skipping re-detect; file is gone: ${filePath}`);
      return;
    }
  } catch (err: unknown) {
    if (!fileExists(filePath)) {
      console.warn(`[STACK] Skipping re-detect due to missing file: ${filePath}`);
      return;
    }
    const error = err as { response?: { status?: number; data?: unknown } };
    console.error('[STACK] Share failed after retries:', error?.response?.status ?? (err as Error).message);
    if (error?.response?.data) console.error(error.response.data);
    // Undetect strategy: temporarily unwatch and re-add after a delay to bypass caching
    try {
      for (let i = 1; i <= REDETECT_MAX_ATTEMPTS; i++) {
        if (!fileExists(filePath)) {
          console.warn(`[STACK] File missing during re-detect; aborting: ${filePath}`);
          return;
        }
        console.warn(`[STACK] Re-detect attempt ${i}/${REDETECT_MAX_ATTEMPTS} for ${filePath}...`);
        watcher.unwatch(filePath);
        await sleep(REDETECT_DELAY_MS);
        watcher.add(filePath);
        try {
          const link = await shareWithRetries(filePath, Math.ceil(RETRY_MAX_ATTEMPTS / 6));
          if (!link) {
            console.warn(`[STACK] File disappeared during re-detect; aborting: ${filePath}`);
            return;
          }
          console.log(`[STACK] Re-detect succeeded for ${filePath}`);
          return;
        } catch {}
      }
      console.error(`[STACK] Re-detect failed for ${filePath} after ${REDETECT_MAX_ATTEMPTS} attempts.`);
    } catch (e) {
      console.error('[STACK] Re-detect error:', (e as Error).message);
    }
  }
});

watcher.on('error', (error) => {
  console.error('[STACK] Watcher error:', error);
});

console.log('[STACK] Watcher started. Press Ctrl+C to stop.');