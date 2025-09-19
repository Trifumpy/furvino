import type { Metadata } from "next";
import { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "Author Novels",
};

export default function AuthorNovelsLayout({ children }: PropsWithChildren) {
  return children;
}
