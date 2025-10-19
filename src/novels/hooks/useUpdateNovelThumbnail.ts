import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type UpdateNovelThumbnailArgs = {
  novelId: string;
  thumbnailFile: File;
}

export function useUpdateNovelThumbnail() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["updateNovelThumbnail"],
    mutationFn: ({ novelId, thumbnailFile }: UpdateNovelThumbnailArgs) => {
      return novels.uploadThumbnail(novelId, thumbnailFile);
    },
  });

  return { updateThumbnail: mutation.mutateAsync, isUpdating: mutation.isPending, error: mutation.error };
}