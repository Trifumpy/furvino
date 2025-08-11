"use client";

import { authorKeys, useRegistry } from "@/utils/client";
import { useQuery } from "@tanstack/react-query";

export function useGetAuthor(authorId: string | null) {
  const { authors } = useRegistry();
  return useQuery({
    queryKey: authorId ? authorKeys.author(authorId) : [],
    queryFn: async () => {
      if (!authorId) return null;
      return await authors.getAuthorById(authorId);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
