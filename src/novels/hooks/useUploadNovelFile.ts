import { Platform } from "@/contracts/novels";
import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type UploadNovelFileArgs = {
  novelId: string;
  platform: Platform;
  file: File;
};

export function useUploadNovelFile() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["uploadNovelFile"],
    mutationFn: ({ novelId, platform, file }: UploadNovelFileArgs) => {
      return novels.uploadFile(novelId, platform, file);
    },
  });

  return { uploadFile: mutation.mutateAsync, isUploading: mutation.isPending, error: mutation.error };
}


