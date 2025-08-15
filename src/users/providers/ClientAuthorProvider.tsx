"use client";

import { PublicAuthor } from "@/contracts/users";
import { useContextOrThrow } from "@/utils/client";
import { createContext, PropsWithChildren } from "react";

type TContext = {
  author: PublicAuthor;
};
const Context = createContext<TContext | null>(null);

type Props = PropsWithChildren<{
  author: PublicAuthor;
}>;

export function ClientAuthorProvider({ author, children }: Props) {
  return <Context.Provider value={{ author }}>{children}</Context.Provider>;
}

export function useAuthor() {
  return useContextOrThrow(Context, "Author");
}
