import { Platform, ListedNovel } from "@/contracts/novels";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";

export type UploadNovelFileArgs = { 
  novelId: string; 
  platform: Platform; 
  file: File;
  uploadConfig?: never; // Not used for download files due to CORS
};

export function useUploadNovelFile() {
  const startTimeRef = useRef<number | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number; etaSeconds: number } | null>(null);

  const mutation = useMutation({
    mutationKey: ["uploadNovelFile"],
    mutationFn: async ({ novelId, platform, file }: UploadNovelFileArgs) => {
      startTimeRef.current = Date.now();
      setProgress({ loaded: 0, total: file.size, percent: 0, etaSeconds: 0 });

      // Use VPS proxy that uploads to STACK via REST API (not WebDAV)
      // This avoids CORS issues while still being faster than WebDAV
      return new Promise<ListedNovel>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
            const bytesPerMs = e.loaded > 0 && elapsedMs > 0 ? e.loaded / elapsedMs : 0;
            const remainingBytes = Math.max(e.total - e.loaded, 0);
            const etaSeconds = bytesPerMs > 0 ? Math.ceil(remainingBytes / bytesPerMs / 1000) : 0;
            setProgress({ loaded: e.loaded, total: e.total, percent, etaSeconds });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText) as ListedNovel;
              resolve(result);
            } catch (err) {
              reject(new Error(`Failed to parse response: ${err}`));
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });

        xhr.open("PUT", `/api/novels/${novelId}/files/${platform}/upload-via-api`);
        xhr.send(formData);
      });
    },
  });

  return { uploadFile: mutation.mutateAsync, isUploading: mutation.isPending, error: mutation.error, progress, stats: null };
}


