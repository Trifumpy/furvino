import type { Metadata, ResolvingMetadata } from "next";
import { PropsWithChildren } from "react";

export async function generateMetadata(_p: unknown, _parent: ResolvingMetadata): Promise<Metadata> {
  return { title: "Collections" };
}

export default function CollectionsLayout({ children }: PropsWithChildren) {
  return children;
}


