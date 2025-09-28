import { Platform } from "@/contracts/novels";
import { uploadFileInParallel } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";

export type UploadNovelFileArgs = { novelId: string; platform: Platform; file: File };

export function useUploadNovelFile() {
  const startTimeRef = useRef<number | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number; etaSeconds: number } | null>(null);
  const [stats, setStats] = useState<{ concurrency: number; inFlight: number; mbps: number } | null>(null);

  const mutation = useMutation({
    mutationKey: ["uploadNovelFile"],
    mutationFn: async ({ novelId, platform, file }: UploadNovelFileArgs) => {
      startTimeRef.current = Date.now();
      setProgress({ loaded: 0, total: file.size, percent: 0, etaSeconds: 0 });

      // Use chunked adaptive uploader to STACK temp path for this novel/platform
      const targetFolder = `novels/${novelId}/files/${platform}`;
      const envPartMb = process.env.NEXT_PUBLIC_UPLOAD_PART_SIZE_MB ? parseInt(process.env.NEXT_PUBLIC_UPLOAD_PART_SIZE_MB, 10) : NaN;
      const optPartSize = Number.isFinite(envPartMb) && envPartMb > 0 ? envPartMb * 1024 * 1024 : undefined;
      const { stackPath } = await uploadFileInParallel(
        { file, targetFolder, filename: file.name },
        {
          adaptive: { enabled: true, min: 2, start: 8, max: 12, windowParts: 10 },
          partSize: optPartSize,
          onProgress: ({ uploadedBytes, totalBytes }) => {
            const percent = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
            const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
            const bytesPerMs = uploadedBytes > 0 && elapsedMs > 0 ? uploadedBytes / elapsedMs : 0;
            const remainingBytes = Math.max(totalBytes - uploadedBytes, 0);
            const etaSeconds = bytesPerMs > 0 ? Math.ceil(remainingBytes / bytesPerMs / 1000) : 0;
            setProgress({ loaded: uploadedBytes, total: totalBytes, percent, etaSeconds });
          },
          onStats: ({ allowed, inFlight, mbps }) => {
            setStats({ concurrency: allowed, inFlight, mbps });
          },
        }
      );

      // Finalize by calling finalize endpoint to register and share the uploaded file
      const url = `/api/novels/${novelId}/files/${platform}/finalize`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stackPath }),
      });
      if (!res.ok) throw new Error(`Finalize failed: ${res.status}`);
      return (await res.json()) as unknown;
    },
  });

  return { uploadFile: mutation.mutateAsync, isUploading: mutation.isPending, error: mutation.error, progress, stats };
}


