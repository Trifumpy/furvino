"use client";

import { createContext, PropsWithChildren, useContext } from "react";
import { Novel } from "../types";

type TContext = {
  novel: Novel | null;
};
const NovelContext = createContext<TContext>({
  novel: null,
});

type Props = PropsWithChildren<{
  novel: Novel;
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
