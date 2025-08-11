import { PublicUser } from "@/contracts/users";
import { useRegistry } from "@/utils/client";
import { useCallback, useEffect, useMemo } from "react";
import { useSearch } from "@/generic/hooks";

export function useSearchUsers() {
  const { users } = useRegistry();
  const fetchUsers = useCallback(
    (search: string) => users.getUsers({ search }),
    [users]
  );

  const { fetching, onSearch, values, addValue } = useSearch(
    useMemo(
      () => ({
        fetchFn: fetchUsers,
        getKey: (value: PublicUser) => value.username,
      }),
      [fetchUsers]
    )
  );

  useEffect(() => {
    onSearch("");
  }, [onSearch]);

  return { fetching, onSearch, users: values, addUser: addValue }
}
