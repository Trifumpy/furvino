'use client';

import React, { createContext, useContext } from "react";
import { Novel } from "../types"

type TContext = {
  novels: Novel[];
}

const NovelsContext = createContext<TContext>({
  novels: []
});

export const NovelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const novels: Novel[] = [];
  
  return (
    <NovelsContext.Provider value={{ novels }}>
      {children}
    </NovelsContext.Provider>
  );
};

export function useNovels() {
  return useContext(NovelsContext);
}
