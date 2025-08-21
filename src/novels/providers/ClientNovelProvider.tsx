"use client";

import { createContext, PropsWithChildren, useContext } from "react";
import { FullNovel } from "@/contracts/novels";
import { useUser } from "@/users/providers";

type TContext = {
  novel: FullNovel | null;
  isAuthor: boolean;
  canEdit: boolean;
};
const NovelContext = createContext<TContext>({
  novel: null,
  isAuthor: false,
  canEdit: false,
});

type Props = PropsWithChildren<{
  novel: FullNovel;
}>;

export function ClientNovelProvider({ novel, children }: Props) {
  const { user, isAdmin } = useUser();
  const isAuthor = user ? novel.author.id === user.authorId : false;
  const canEdit = isAuthor || !!isAdmin;

  return (
    <NovelContext.Provider
      value={{
        novel,
        isAuthor,
        canEdit,
      }}
    >
      {children}
    </NovelContext.Provider>
  );
}

export function useNovel() {
  return useContext(NovelContext);
}
