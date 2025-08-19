import { Platform } from "@/contracts/novels";
import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";

export type UploadNovelFileArgs = {
  novelId: string;
  platform: Platform;
  file: File;
};

export function useUploadNovelFile() {
  const { novels } = useRegistry();
  const startTimeRef = useRef<number | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number; etaSeconds: number } | null>(null);

  const mutation = useMutation({
    mutationKey: ["uploadNovelFile"],
    mutationFn: ({ novelId, platform, file }: UploadNovelFileArgs) => {
      startTimeRef.current = Date.now();
      setProgress({ loaded: 0, total: file.size, percent: 0, etaSeconds: 0 });
      return novels.uploadFile(novelId, platform, file, (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        const bytesPerMs = loaded > 0 && elapsedMs > 0 ? loaded / elapsedMs : 0;
        const remainingBytes = Math.max(total - loaded, 0);
        const etaSeconds = bytesPerMs > 0 ? Math.ceil(remainingBytes / bytesPerMs / 1000) : 0;
        setProgress({ loaded, total, percent, etaSeconds });
      });
    },
  });

  return { uploadFile: mutation.mutateAsync, isUploading: mutation.isPending, error: mutation.error, progress };
}


