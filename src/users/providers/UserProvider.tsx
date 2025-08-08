"use client";

import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { useGetMe } from "./hooks";
import { ListedUser } from "@/contracts/users";

type TContext = {
  user: ListedUser;
  isAdmin: boolean;
};
const Context = createContext<Partial<TContext>>({});

export function UserProvider({ children }: PropsWithChildren) {
  const { data: user } = useGetMe();

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return Boolean(user.roles?.includes("admin"));
  }, [user]);

  return (
    <Context.Provider value={{ user: user ?? undefined, isAdmin }}>
      {children}
    </Context.Provider>
  );
}

export function useUser() {
  return useContext(Context);
}
export function useUserOrThrow() {
  const value = useContext(Context);
  if (!value.user) {
    throw new Error("User is not authenticated");
  }
  return {
    user: value.user,
    isAdmin: !!value.isAdmin,
  };
}
