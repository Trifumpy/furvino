import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { UploadStats } from "@/utils/services/novels";

export type UpdateNovelThumbnailArgs = {
  novelId: string;
  thumbnailFile: File;
}

export function useUpdateNovelThumbnail() {
  const { novels } = useRegistry();
  const [stats, setStats] = useState<UploadStats | null>(null);

  const mutation = useMutation({
    mutationKey: ["updateNovelThumbnail"],
    mutationFn: async ({ novelId, thumbnailFile }: UpdateNovelThumbnailArgs) => {
      setStats(null);
      return novels.uploadThumbnailWithStats(novelId, thumbnailFile, (stats) => {
        setStats(stats);
      });
    },
  });

  return { 
    updateThumbnail: mutation.mutateAsync, 
    isUpdating: mutation.isPending, 
    error: mutation.error,
    stats,
  };
}