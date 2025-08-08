"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export function useCreateNovel() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["createNovel"],
    mutationFn: async (data: CreateNovelBody) => {
      return await novels.createNovel(data);
    },
    onError: (error) => {
      console.error("Error creating novel:", error);
    },
  })

  return {
    createNovel: mutation.mutateAsync,
    isCreating: mutation.isPending,
  }
}