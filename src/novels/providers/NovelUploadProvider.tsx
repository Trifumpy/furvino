"use client";

import { createContext, PropsWithChildren, useContext } from "react";

type UploadContext = {
  config: null;
  isReady: boolean;
  error: string | null;
};

const NovelUploadContext = createContext<UploadContext>({
  config: null,
  isReady: false,
  error: null,
});

type Props = PropsWithChildren<{
  novelId: string;
}>;

export function NovelUploadProvider({ children }: Props) {
  // Direct Stack uploads are disabled - using VPS WebDAV uploads instead
  return (
    <NovelUploadContext.Provider
      value={{
        config: null,
        isReady: false,
        error: null,
      }}
    >
      {children}
    </NovelUploadContext.Provider>
  );
}

export function useNovelUpload() {
  return useContext(NovelUploadContext);
}

