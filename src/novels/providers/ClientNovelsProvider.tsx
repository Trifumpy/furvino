"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ListedNovel } from "@/contracts/novels";

type TContext = {
  novels: ListedNovel[];
  favoriteIds: Set<string>;
  favoriteNovels: ListedNovel[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (id: string) => void;
};
const NovelsContext = createContext<TContext>({
  novels: [],
  favoriteIds: new Set(),
  favoriteNovels: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  toggleFavorite: () => {},
});

type Props = PropsWithChildren<{
  novels: ListedNovel[];
}>;

export function ClientNovelsProvider({ novels, children }: Props) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const favoriteNovels = useMemo(() => {
    return novels.filter((novel) => favoriteIds.has(novel.id));
  }, [favoriteIds, novels]);

  const addFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  }, []);
  const removeFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return (
    <NovelsContext.Provider
      value={{
        novels,
        favoriteNovels,
        favoriteIds,
        addFavorite,
        removeFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </NovelsContext.Provider>
  );
}

export function useNovels() {
  return useContext(NovelsContext);
}
