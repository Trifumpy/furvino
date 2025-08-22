import { Platform } from "@/contracts/novels";
import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type DeleteNovelFileArgs = {
  novelId: string;
  platform: Platform;
};

export function useDeleteNovelFile() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["deleteNovelFile"],
    mutationFn: async ({ novelId, platform }: DeleteNovelFileArgs) => {
      await novels.deleteFile(novelId, platform);
      // Return FullNovel by fetching fresh data
      return await novels.getNovelById(novelId);
    },
  });

  return { deleteFile: mutation.mutateAsync, isDeleting: mutation.isPending, error: mutation.error };
}


