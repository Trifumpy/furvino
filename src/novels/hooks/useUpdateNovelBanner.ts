import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { uploadFileToShare, type ShareUploadConfig } from "@/utils/client/stackUpload";

export type UpdateNovelBannerArgs = {
  novelId: string;
  bannerFile: File;
  uploadConfig?: ShareUploadConfig | null;
}

const ENABLE_WEBDAV_FALLBACK = process.env.NEXT_PUBLIC_ENABLE_WEBDAV_FALLBACK === "true";

export function useUpdateNovelBanner() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["updateNovelBanner"],
    mutationFn: async ({ novelId, bannerFile, uploadConfig }: UpdateNovelBannerArgs) => {
      // If upload config is provided, use direct STACK upload
      if (uploadConfig) {
        try {
          await uploadFileToShare(bannerFile, uploadConfig, "banner");
          // The file is uploaded, but we still need to update the DB record
          // by calling the backend to generate the proper URL
          return await novels.uploadBanner(novelId, bannerFile);
        } catch (err) {
          // Only fall back to VPS if explicitly enabled
          if (ENABLE_WEBDAV_FALLBACK) {
            console.error("Direct upload failed, falling back to VPS upload:", err);
            return await novels.uploadBanner(novelId, bannerFile);
          }
          // Otherwise, throw the error
          throw err;
        }
      }
      
      // If no upload config and WebDAV fallback is enabled, use VPS upload
      if (ENABLE_WEBDAV_FALLBACK) {
        return novels.uploadBanner(novelId, bannerFile);
      }
      
      // No upload config and no fallback enabled
      throw new Error("Direct upload is not available and WebDAV fallback is disabled");
    },
  });

  return { updateBanner: mutation.mutateAsync, isUpdating: mutation.isPending, error: mutation.error };
}
