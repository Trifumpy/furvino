import type { Metadata } from "next";
import { PropsWithChildren } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Collections" };
}

export default function CollectionsLayout({ children }: PropsWithChildren) {
  return children;
}


