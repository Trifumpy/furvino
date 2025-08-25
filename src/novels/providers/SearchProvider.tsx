"use client";

import { createContext, PropsWithChildren, useContext, useState } from "react";
import { ListedNovel } from "@/contracts/novels";
import { useNovels } from "./ClientNovelsProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TContext = {
  searchQuery: string | undefined;
  setSearchQuery: (query: string | undefined) => void;
  filteredNovels: ListedNovel[];
};
const SearchContext = createContext<TContext>({
  searchQuery: undefined,
  setSearchQuery: () => {},
  filteredNovels: [],
});

export function SearchProvider({ children }: PropsWithChildren) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, _setSearchQuery] = useState<string | undefined>(
    typeof sp?.get("q") === "string" && sp.get("q") !== ""
      ? (sp.get("q") as string)
      : undefined
  );
  const { novels } = useNovels();

  const setSearchQuery = (query: string | undefined) => {
    _setSearchQuery(query);
    const params = new URLSearchParams(sp?.toString() || "");
    if (!query) {
      params.delete("q");
    } else {
      params.set("q", query);
    }
    // reset to page 1 when search changes
    params.delete("page");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `/?${qs}` : "/"}`);
  };

  // With server-side search, filteredNovels is just novels
  const filteredNovels = novels;

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
