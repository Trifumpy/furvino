import type { Metadata } from "next";
import { PropsWithChildren } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Furvino" };
}

export default function BrowseLayout({ children }: PropsWithChildren) {
  return children;
}
