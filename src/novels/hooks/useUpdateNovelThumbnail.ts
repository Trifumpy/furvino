import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export type UpdateNovelThumbnailArgs = {
  novelId: string;
  thumbnailFile: File;
}

export function useUpdateNovelThumbnail() {
  const { novels } = useRegistry();
  const [progress, setProgress] = useState<null>(null);

  const mutation = useMutation({
    mutationKey: ["updateNovelThumbnail"],
    mutationFn: async ({ novelId, thumbnailFile }: UpdateNovelThumbnailArgs) => {
      setProgress(null);
      return novels.uploadThumbnail(novelId, thumbnailFile);
    },
  });

  return { 
    updateThumbnail: mutation.mutateAsync, 
    isUpdating: mutation.isPending, 
    error: mutation.error,
    progress,
  };
}