"use client";

import React, { PropsWithChildren, useMemo } from "react";
import { Registry } from "../services";
import { useContextOrThrow } from "./hooks";

type TContext = Registry;
const Context = React.createContext<TContext | null>(null);

export function RegistryProvider({ children }: PropsWithChildren) {
  const registry = useMemo(() => Registry.get(), []);

  return <Context.Provider value={registry}>{children}</Context.Provider>;
}

export function useRegistry() {
  return useContextOrThrow(Context, "Registry");
}
