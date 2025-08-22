import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type DeleteGalleryItemArgs = {
  novelId: string;
  galleryItemId: string;
};

export function useDeleteNovelGalleryItem() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["deleteNovelGalleryItem"],
    mutationFn: ({
      novelId,
      galleryItemId,
    }: DeleteGalleryItemArgs) => {
      return novels.deleteGalleryItem(novelId, galleryItemId);
    },
  });

  return {
    deleteGalleryItem: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
