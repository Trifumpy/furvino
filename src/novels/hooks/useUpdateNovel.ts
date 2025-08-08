"use client";

import { UpdateNovelBody } from "@/contracts/novels";
import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export function useUpdateNovel(novelId: string) {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["updateNovel", novelId],
    mutationFn: async (novelData: UpdateNovelBody) => {
      return await novels.updateNovel(novelId, novelData);
    },
  });

  return {
    updateNovel: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  }
}