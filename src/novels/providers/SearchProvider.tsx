"use client";

import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { Novel } from "../types";
import { useNovels } from "./ClientNovelsProvider";

type TContext = {
  searchQuery: string | undefined;
  setSearchQuery: (query: string | undefined) => void;
  filteredNovels: Novel[];
};
const SearchContext = createContext<TContext>({
  searchQuery: undefined,
  setSearchQuery: () => {},
  filteredNovels: [],
});

export function SearchProvider({ children }: PropsWithChildren) {
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const { novels } = useNovels();

  const filteredNovels = useMemo(() => {
    if (!searchQuery) return novels;
    return novels.filter(
      (novel) =>
        novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        novel.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        novel.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
  }, [searchQuery, novels]);

  return (
    <SearchContext.Provider
      value={{ searchQuery, setSearchQuery, filteredNovels }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
