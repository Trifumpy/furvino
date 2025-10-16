"use client";

import { UpdateNovelLayoutBody } from "@/contracts/novels";
import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export function useUpdateNovelLayout(novelId: string) {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["updateNovelLayout", novelId],
    mutationFn: async (layout: UpdateNovelLayoutBody) => {
      return await novels.updateLayout(novelId, layout);
    },
  });

  return {
    updateLayout: mutation.mutateAsync,
    isUpdatingLayout: mutation.isPending,
  };
}

