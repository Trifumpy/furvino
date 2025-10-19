export type StartUploadResponse = {
  uploadId: string;
  partSize: number;
  filename: string;
  targetFolder: string;
  stackPath: string;
};

export type ParallelUploaderOptions = {
  concurrency?: number; // number of simultaneous part requests
  partSize?: number; // bytes; server may override
  retry?: {
    retries: number;
    backoffMs: number; // base backoff
    backoffFactor?: number; // multiplier per attempt
  };
  signal?: AbortSignal;
  onProgress?: (progress: { uploadedBytes: number; totalBytes: number; uploadedParts: number; totalParts: number }) => void;
  headers?: Record<string, string>; // extra headers for auth, etc.
  onStats?: (stats: { allowed: number; inFlight: number; uploadedBytes: number; totalBytes: number; mbps: number; concurrency: number; partSize: number }) => void;
};

const DEFAULT_UPLOAD_CONCURRENCY = (() => {
  const raw = process.env.NEXT_PUBLIC_UPLOAD_CONCURRENCY;
  const v = raw ? parseInt(raw, 10) : NaN;
  const MAX_CONCURRENCY = 64;
  if (Number.isFinite(v) && v > 0) {
    return Math.min(v, MAX_CONCURRENCY); // cap at 64
  }
  return 8;
})();

const DEFAULT_PART_SIZE_BYTES = (() => {
  const raw = process.env.NEXT_PUBLIC_UPLOAD_PART_SIZE_MB;
  const mb = raw ? parseInt(raw, 10) : NaN;
  const MIN_PART_SIZE = 1; // 1 MiB
  const MAX_PART_SIZE = 100; // 100 MiB
  if (Number.isFinite(mb) && mb > 0) {
    const capped = Math.max(MIN_PART_SIZE, Math.min(mb, MAX_PART_SIZE));
    const bytes = capped * 1024 * 1024;
    if (mb !== capped) {
      console.warn(`[Upload] Part size ${mb}MB capped to valid range [${MIN_PART_SIZE}-${MAX_PART_SIZE}]MB`);
    }
    return bytes;
  }
  return undefined; // fall back to server default (8 MiB)
})();

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

async function fetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function withRetry<T>(fn: () => Promise<T>, retry: ParallelUploaderOptions["retry"], signal?: AbortSignal): Promise<T> {
  const max = retry?.retries ?? 3;
  const base = retry?.backoffMs ?? 500;
  const factor = retry?.backoffFactor ?? 2;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt > max) throw e;
      const jitter = Math.random() * 100;
      const backoff = base * Math.pow(factor, attempt - 1) + jitter;
      await delay(backoff, signal);
    }
  }
}

export async function uploadFileInParallel(
  params: {
    file: Blob;
    targetFolder: string; // relative to STACK prefix
    filename: string; // display filename
  },
  options: ParallelUploaderOptions = {}
): Promise<{ stackPath: string; uploadId: string; shareUrl: string }> {
  const {
    concurrency,
    partSize,
    retry = { retries: 3, backoffMs: 500, backoffFactor: 2 },
    signal,
    onProgress,
    headers = {},
    onStats,
  } = options;

  const allowedConcurrency = Math.max(1, concurrency ?? DEFAULT_UPLOAD_CONCURRENCY);

  // 1) Start session
  const initBody = JSON.stringify({ targetFolder: params.targetFolder, filename: params.filename, totalSize: params.file.size, partSize: partSize ?? DEFAULT_PART_SIZE_BYTES });
  const initRes: StartUploadResponse = await fetchJson(`/api/uploads/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: initBody,
    signal,
  });

  console.log(`[Upload] Starting parallel upload with concurrency: ${allowedConcurrency}`);

  const { uploadId, partSize: serverPartSize } = initRes;
  const actualPartSize = serverPartSize;

  // 2) Enqueue parts
  const totalBytes = params.file.size;
  const totalParts = Math.ceil(totalBytes / actualPartSize);
  let uploadedBytes = 0;
  let uploadedParts = 0;

  const startTimeMs = Date.now();

  const queue: number[] = [];
  for (let i = 0; i < totalParts; i++) queue.push(i + 1); // 1-based parts

  // Metrics
  type PartWindowRec = { durationMs: number; attempts: number };
  let inFlight = 0;
  const windowRecs: PartWindowRec[] = [];
  let failed: Error | null = null;
  let emaMbps = 0;
  const emaAlpha = 0.3;

  const computeMbps = () => {
    const elapsedMs = Math.max(1, Date.now() - startTimeMs);
    const bytesPerSec = (uploadedBytes / elapsedMs) * 1000;
    return bytesPerSec / (1024 * 1024);
  };

  const progressUpdate = () => {
    onProgress?.({ uploadedBytes, totalBytes, uploadedParts, totalParts });
    onStats?.({ allowed: allowedConcurrency, inFlight, uploadedBytes, totalBytes, mbps: computeMbps(), concurrency: allowedConcurrency, partSize: actualPartSize });
  };
  progressUpdate();

  const uploadPart = async (partNumber: number) => {
    const start = (partNumber - 1) * actualPartSize;
    const end = Math.min(start + actualPartSize, totalBytes);
    const chunk = params.file.slice(start, end);

    const t0 = Date.now();
    let attempts = 0;
    await withRetry(async () => {
      attempts++;
      const res = await fetch(`/api/uploads/${uploadId}/part?part=${partNumber}`, {
        method: "PUT",
        body: chunk,
        headers: { ...headers },
        signal,
      });
      if (!res.ok) throw new Error(`Part ${partNumber} failed with ${res.status}`);
    }, retry, signal);

    uploadedBytes += chunk.size;
    uploadedParts += 1;
    // Update EMA speed for smoother display
    const inst = computeMbps();
    emaMbps = emaMbps === 0 ? inst : emaMbps * (1 - emaAlpha) + inst * emaAlpha;
    progressUpdate();

    const durationMs = Date.now() - t0;
    windowRecs.push({ durationMs, attempts });
  };

  // 3) Scheduler
  const statsIntervalMs = 500;
  let statsTimer: ReturnType<typeof setInterval> | null = null;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      if (statsTimer) {
        clearInterval(statsTimer);
        statsTimer = null;
      }
    };

    const schedule = () => {
      if (failed) return; // stop scheduling
      while (inFlight < allowedConcurrency && queue.length > 0) {
        const part = queue.shift();
        if (part == null) break;
        inFlight++;
        uploadPart(part)
          .catch((e) => {
            failed = e instanceof Error ? e : new Error(String(e));
          })
          .finally(() => {
            inFlight--;
            if (failed) {
              cleanup();
              reject(failed);
              return;
            }
            if (uploadedParts >= totalParts) {
              cleanup();
              resolve();
              return;
            }
            schedule();
          });
      }
      if (inFlight === 0 && queue.length === 0) {
        cleanup();
        if (failed) reject(failed);
        else resolve();
      }
    };

    schedule();

    if (signal) {
      const onAbort = () => {
        failed = new DOMException("Aborted", "AbortError");
        cleanup();
        reject(failed);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    if (onStats) {
      statsTimer = setInterval(() => {
        onStats({ allowed: allowedConcurrency, inFlight, uploadedBytes, totalBytes, mbps: emaMbps || computeMbps(), concurrency: allowedConcurrency, partSize: actualPartSize });
      }, statsIntervalMs);
    }
  });

  // 4) Complete
  console.log(`[Upload] All parts for ${uploadId} uploaded. Completing...`);
  const complete = await fetchJson(`/api/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ totalParts }),
    signal,
  });

  if (!complete.shareUrl) {
    console.error("[Upload] Completion response did not include a shareUrl.", complete);
    throw new Error("Failed to get share URL after upload.");
  }

  return { stackPath: complete.stackPath as string, uploadId, shareUrl: complete.shareUrl as string };
}


