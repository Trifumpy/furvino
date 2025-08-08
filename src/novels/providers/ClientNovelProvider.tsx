"use client";

import { createContext, PropsWithChildren, useContext } from "react";
import { ListedNovel } from "@/contracts/novels";

type TContext = {
  novel: ListedNovel | null;
};
const NovelContext = createContext<TContext>({
  novel: null,
});

type Props = PropsWithChildren<{
  novel: ListedNovel;
}>;

export function ClientNovelProvider({ novel, children }: Props) {
  return (
    <NovelContext.Provider
      value={{
        novel,
      }}
    >
      {children}
    </NovelContext.Provider>
  );
}

export function useNovel() {
  return useContext(NovelContext);
}
