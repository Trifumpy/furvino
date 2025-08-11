import { StringIndex } from "@/utils/lib/collections";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStateRef } from "./useStateRef";

type Props<T> = {
  fetchFn: (query: string) => Promise<T[]>;
  getKey: (value: T) => string;
};
type Result<T> = {
  onSearch: (query: string) => Promise<void>;
  values: T[];
  fetching: boolean;
  addValue: (value: T) => void;
};

const normalizeQuery = (q: string) => q.trim().toLowerCase();

export function useSearch<T>({ fetchFn, getKey }: Props<T>): Result<T> {
  const index = useRef(new StringIndex<T>());
  const [fetching, setFetching, fetchingRef] = useStateRef(false);
  const [values, setValues] = useState<T[]>([]);
  const searchedQueries = useRef<Set<string>>(new Set());

  const nextTask = useRef<() => Promise<void> | null>(null);

  const updateValues = useCallback((query: string) => {
    const results = index.current.findInfix(query);
    setValues(results);
  }, []);

  const handleValues = useCallback(
    (query: string, newValues: T[]) => {
      newValues.forEach((value) => {
        index.current.add(getKey(value), value);
      });
      updateValues(query);
    },
    [getKey, updateValues]
  );

  const internalSearch = useCallback(
    async (query: string) => {
      searchedQueries.current.add(query);
      setFetching(true);
      const results = await fetchFn(query);
      handleValues(query, results);
      setFetching(false);
      if (nextTask.current) {
        const task = nextTask.current;
        nextTask.current = null;
        await task();
      }
    },
    [fetchFn, setFetching, handleValues]
  );

  const onSearch = useCallback(
    async (query: string) => {
      const normQuery = normalizeQuery(query);
      const needsSearch = !searchedQueries.current.has(normQuery);

      if (needsSearch) {
        if (fetchingRef.current) {
          nextTask.current = async () => internalSearch(normQuery);
          return;
        } else {
          internalSearch(normQuery);
        }
      }
      updateValues(normQuery);
    },
    [fetchingRef, internalSearch, updateValues]
  );

  const addValue = useCallback(
    (value: T) => {
      const key = getKey(value);
      if (!index.current.get(key)) {
        index.current.add(key, value);
        setValues((prev) => [...prev, value]);
      }
    },
    [getKey]
  );

  return { fetching, onSearch, values, addValue };
}

export function useSearchWithQuery<T>(
  {
    query,
    ...props
  }: { query: string } & Props<T>
) {
  const { onSearch, ...rest } = useSearch({ ...props });
  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);
  return { onSearch, ...rest };
}
