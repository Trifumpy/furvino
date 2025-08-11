import { PublicAuthor } from "@/contracts/users";
import { useRegistry } from "@/utils/client";
import { useCallback, useEffect, useMemo } from "react";
import { useSearch } from "@/generic/hooks";

export function useSearchAuthors() {
  const { authors } = useRegistry();

  const fetchAuthors = useCallback(
    (search: string) => authors.getAuthors({ search }),
    [authors]
  );

  const { fetching, onSearch, values, addValue } = useSearch(
    useMemo(
      () => ({
        fetchFn: fetchAuthors,
        getKey: (value: PublicAuthor) => value.name,
      }),
      [fetchAuthors]
    )
  );

  useEffect(() => {
    onSearch("");
  }, [onSearch]);

  return { fetching, onSearch, authors: values, addAuthor: addValue }
}
