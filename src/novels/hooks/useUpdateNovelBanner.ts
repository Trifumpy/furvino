import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { UploadStats } from "@/utils/services/novels";

export type UpdateNovelBannerArgs = {
  novelId: string;
  bannerFile: File;
}

export function useUpdateNovelBanner() {
  const { novels } = useRegistry();
  const [stats, setStats] = useState<UploadStats | null>(null);

  const mutation = useMutation({
    mutationKey: ["updateNovelBanner"],
    mutationFn: async ({ novelId, bannerFile }: UpdateNovelBannerArgs) => {
      setStats(null);
      return novels.uploadBannerWithStats(novelId, bannerFile, (stats) => {
        setStats(stats);
      });
    },
  });

  return { 
    updateBanner: mutation.mutateAsync, 
    isUpdating: mutation.isPending, 
    error: mutation.error,
    stats,
  };
}
