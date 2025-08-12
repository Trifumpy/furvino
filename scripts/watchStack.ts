import chokidar from "chokidar";
import fs from "fs";

const baseDir = process.env.STACK_WATCH_DIR || "/home/github/STACK/furvino/novels";
const apiUrl = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/stack/share`
  : "http://localhost:3000/api/stack/share";

function isFile(p: string) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

if (!fs.existsSync(baseDir)) {
  console.warn(`[STACK] Watch directory does not exist: ${baseDir}`);
  console.warn(
    "[STACK] Set STACK_WATCH_DIR to your actual local sync path for 'furvino/novels' and rerun."
  );
}

const watcher = chokidar.watch(baseDir, {
  persistent: true,
  ignoreInitial: false,
  usePolling: true,
  interval: 500,
  followSymlinks: true,
  awaitWriteFinish: {
    stabilityThreshold: 1500,
    pollInterval: 250,
  },
});

watcher.on("add", async (filePath) => {
  if (!isFile(filePath)) return;
  if (!filePath.startsWith(baseDir)) return;
  console.log(`[STACK] New file detected: ${filePath}`);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });
    const data = (await res.json()) as { success: boolean; shareUrl?: string; error?: string };
    if (!res.ok || !data.success) {
      console.error(`[STACK] Share failed: ${data.error || res.statusText}`);
    } else {
      console.log(`[STACK] Share created: ${data.shareUrl}`);
    }
  } catch (err) {
    console.error(`[STACK] Error creating share: ${(err as Error).message}`);
  }
});

watcher.on("all", (event, p) => {
  console.log(`[STACK] Event: ${event} -> ${p}`);
});

watcher.on("ready", () => {
  console.log(`[STACK] Watching for new files under ${baseDir}`);
});