import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type UpdateNovelBannerArgs = {
  novelId: string;
  bannerFile: File;
}

export function useUpdateNovelBanner() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["updateNovelBanner"],
    mutationFn: ({ novelId, bannerFile }: UpdateNovelBannerArgs) => {
      return novels.uploadBanner(novelId, bannerFile);
    },
  });

  return { updateBanner: mutation.mutateAsync, isUpdating: mutation.isPending, error: mutation.error };
}
