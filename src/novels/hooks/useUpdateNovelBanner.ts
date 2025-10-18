import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export type UpdateNovelBannerArgs = {
  novelId: string;
  bannerFile: File;
}

export function useUpdateNovelBanner() {
  const { novels } = useRegistry();
  const [progress, setProgress] = useState<null>(null);

  const mutation = useMutation({
    mutationKey: ["updateNovelBanner"],
    mutationFn: async ({ novelId, bannerFile }: UpdateNovelBannerArgs) => {
      setProgress(null);
      return novels.uploadBanner(novelId, bannerFile);
    },
  });

  return { 
    updateBanner: mutation.mutateAsync, 
    isUpdating: mutation.isPending, 
    error: mutation.error,
    progress,
  };
}
