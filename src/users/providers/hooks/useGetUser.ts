"use client";

import { useRegistry, userKeys } from "@/utils/client";
import { useQuery } from "@tanstack/react-query";

export function useGetUser(userId: string) {
  const { users } = useRegistry();
  return useQuery({
    queryKey: userKeys.user(userId),
    queryFn: async () => {
      return await users.getUser(userId);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
