"use client";

import { useRegistry, userKeys } from "@/utils/client";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useGetMe() {
  const { userId: clerkId } = useAuth();
  const { users } = useRegistry();

  const query = useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      return await users.getMe().catch(() => null);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (clerkId) {
      query.refetch();
    }
  // We only want to rerun this effect when clerkId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkId]);

  return query;
}
