"use client";

import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export function useDeleteNovel(novelId: string) {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["deleteNovel", novelId],
    mutationFn: async () => {
      return await novels.deleteNovel(novelId);
    },
  });

  return {
    deleteNovel: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  }
}
