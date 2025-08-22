import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type CreateGalleryItemArgs = {
  novelId: string;
  galleryItemFile: File;
};

export function useCreateNovelGalleryItem() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["createNovelGalleryItem"],
    mutationFn: ({ novelId, galleryItemFile }: CreateGalleryItemArgs) => {
      return novels.uploadGalleryItem(novelId, galleryItemFile);
    },
  });

  return {
    createGalleryItem: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
