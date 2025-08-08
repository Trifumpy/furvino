import { NovelsProvider, SearchProvider } from "@/novels/providers";
import { PropsWithChildren } from "react";

export default function BrowseLayout({ children }: PropsWithChildren) {
  return (
    <NovelsProvider>
      <SearchProvider>{children}</SearchProvider>
    </NovelsProvider>
  );
}
