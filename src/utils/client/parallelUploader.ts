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
  adaptive?: boolean | {
    enabled?: boolean;
    min?: number; // minimum allowed concurrency
    start?: number; // starting concurrency
    max?: number; // maximum allowed concurrency
    rampUpStep?: number; // how many to add when increasing
    rampDownStep?: number; // how many to remove when decreasing
    windowParts?: number; // evaluate after N parts complete
    errorRateThreshold?: number; // decrease if retry/error rate exceeds this
    throttleStatusCodes?: number[]; // treat these as throttle signals (e.g., 429, 503)
  };
  onStats?: (stats: { allowed: number; inFlight: number; uploadedBytes: number; totalBytes: number; mbps: number }) => void;
};

const DEFAULT_UPLOAD_CONCURRENCY = (() => {
  const raw = process.env.NEXT_PUBLIC_UPLOAD_CONCURRENCY;
  const v = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 8;
})();

const DEFAULT_PART_SIZE_BYTES = (() => {
  const raw = process.env.NEXT_PUBLIC_UPLOAD_PART_SIZE_MB;
  const mb = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(mb) && mb > 0) return mb * 1024 * 1024;
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
): Promise<{ stackPath: string; uploadId: string }> {
  const {
    concurrency,
    partSize,
    retry = { retries: 3, backoffMs: 500, backoffFactor: 2 },
    signal,
    onProgress,
    headers = {},
    adaptive,
    onStats,
  } = options;

  // Determine strategy: fixed or adaptive
  const adaptiveCfg = typeof adaptive === "object" ? adaptive : { enabled: adaptive };
  const adaptiveEnabled = concurrency == null && (adaptiveCfg.enabled ?? true);
  const minConc = Math.max(1, adaptiveCfg.min ?? 2);
  const startConc = Math.max(minConc, adaptiveCfg.start ?? DEFAULT_UPLOAD_CONCURRENCY);
  const maxConc = Math.max(startConc, adaptiveCfg.max ?? Math.max(DEFAULT_UPLOAD_CONCURRENCY, 16));
  const rampUpStep = Math.max(1, adaptiveCfg.rampUpStep ?? 1);
  const rampDownStep = Math.max(1, adaptiveCfg.rampDownStep ?? 1);
  const windowParts = Math.max(1, adaptiveCfg.windowParts ?? 10);
  const errorRateThreshold = Math.min(1, Math.max(0, adaptiveCfg.errorRateThreshold ?? 0.15));
  const throttleCodes = adaptiveCfg.throttleStatusCodes ?? [429, 503];

  // 1) Start session
  const initBody = JSON.stringify({ targetFolder: params.targetFolder, filename: params.filename, totalSize: params.file.size, partSize: partSize ?? DEFAULT_PART_SIZE_BYTES });
  const initRes: StartUploadResponse = await fetchJson(`/api/uploads/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: initBody,
    signal,
  });

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

  // Metrics for adaptive tuning
  type PartWindowRec = { durationMs: number; attempts: number; sawThrottled: boolean };
  let currentAllowed = adaptiveEnabled ? startConc : (concurrency ?? DEFAULT_UPLOAD_CONCURRENCY);
  let inFlight = 0;
  let windowRecs: PartWindowRec[] = [];
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
    onStats?.({ allowed: currentAllowed, inFlight, uploadedBytes, totalBytes, mbps: computeMbps() });
  };
  progressUpdate();

  const adjustConcurrencyIfNeeded = () => {
    if (!adaptiveEnabled) return;
    if (windowRecs.length < windowParts) return;
    const attemptsOver1 = windowRecs.filter(r => r.attempts > 1).length;
    const throttled = windowRecs.filter(r => r.sawThrottled).length;
    const errRate = attemptsOver1 / windowRecs.length;
    const throttleRate = throttled / windowRecs.length;

    if (throttleRate > 0 || errRate > errorRateThreshold) {
      // Back off on throttle or high retry rate
      currentAllowed = Math.max(minConc, currentAllowed - rampDownStep);
    } else {
      // If we were fully utilized and have backlog, try increasing
      if (inFlight >= currentAllowed && queue.length > 0) {
        currentAllowed = Math.min(maxConc, currentAllowed + rampUpStep);
      }
    }
    windowRecs = [];
    onStats?.({ allowed: currentAllowed, inFlight, uploadedBytes, totalBytes, mbps: computeMbps() });
  };

  const uploadPart = async (partNumber: number) => {
    const start = (partNumber - 1) * actualPartSize;
    const end = Math.min(start + actualPartSize, totalBytes);
    const chunk = params.file.slice(start, end);

    const t0 = Date.now();
    let attempts = 0;
    let sawThrottled = false;
    await withRetry(async () => {
      attempts++;
      const res = await fetch(`/api/uploads/${uploadId}/part?part=${partNumber}`, {
        method: "PUT",
        body: chunk,
        headers: { ...headers },
        signal,
      });
      if (!res.ok) {
        if (throttleCodes.includes(res.status)) sawThrottled = true;
        throw new Error(`Part ${partNumber} failed with ${res.status}`);
      }
    }, retry, signal);

    uploadedBytes += chunk.size;
    uploadedParts += 1;
    // Update EMA speed for smoother display
    const inst = computeMbps();
    emaMbps = emaMbps === 0 ? inst : emaMbps * (1 - emaAlpha) + inst * emaAlpha;
    progressUpdate();

    const durationMs = Date.now() - t0;
    windowRecs.push({ durationMs, attempts, sawThrottled });
    adjustConcurrencyIfNeeded();
  };

  // 3) Dynamic scheduler
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
      while (inFlight < currentAllowed && queue.length > 0) {
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
            // Keep scheduling as parts complete
            schedule();
          });
      }
      // If nothing to schedule and none in flight and queue empty, complete
      if (inFlight === 0 && queue.length === 0) {
        cleanup();
        if (failed) reject(failed);
        else resolve();
      }
    };

    // Initial kick
    schedule();

    // React to abort early
    if (signal) {
      const onAbort = () => {
        failed = new DOMException("Aborted", "AbortError");
        cleanup();
        reject(failed);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    // Periodic stats update for smoother UI on high-latency links
    if (onStats) {
      statsTimer = setInterval(() => {
        onStats({ allowed: currentAllowed, inFlight, uploadedBytes, totalBytes, mbps: emaMbps || computeMbps() });
      }, statsIntervalMs);
    }
  });

  // 4) Complete
  const complete = await fetchJson(`/api/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ totalParts }),
    signal,
  });

  return { stackPath: complete.stackPath as string, uploadId };
}


