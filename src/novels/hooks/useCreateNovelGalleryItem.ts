import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { uploadFileToShare, type ShareUploadConfig } from "@/utils/client/stackUpload";

export type CreateGalleryItemArgs = {
  novelId: string;
  galleryItemFile: File;
  slot?: number;
  uploadConfig?: ShareUploadConfig | null;
};

const ENABLE_WEBDAV_FALLBACK = process.env.NEXT_PUBLIC_ENABLE_WEBDAV_FALLBACK === "true";

export function useCreateNovelGalleryItem() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["createNovelGalleryItem"],
    mutationFn: async ({ novelId, galleryItemFile, slot, uploadConfig }: CreateGalleryItemArgs) => {
      // If upload config is provided, use direct STACK upload
      if (uploadConfig) {
        try {
          await uploadFileToShare(galleryItemFile, uploadConfig, "gallery");
          // The file is uploaded, but we still need to update the DB record
          // by calling the backend to generate the proper URL
          return await novels.uploadGalleryItem(novelId, galleryItemFile, { slot });
        } catch (err) {
          // Only fall back to VPS if explicitly enabled
          if (ENABLE_WEBDAV_FALLBACK) {
            console.error("Direct upload failed, falling back to VPS upload:", err);
            return await novels.uploadGalleryItem(novelId, galleryItemFile, { slot });
          }
          // Otherwise, throw the error
          throw err;
        }
      }
      
      // If no upload config and WebDAV fallback is enabled, use VPS upload
      if (ENABLE_WEBDAV_FALLBACK) {
        return novels.uploadGalleryItem(novelId, galleryItemFile, { slot });
      }
      
      // No upload config and no fallback enabled
      throw new Error("Direct upload is not available and WebDAV fallback is disabled");
    },
  });

  return {
    createGalleryItem: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
