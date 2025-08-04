import { PropsWithChildren } from "react";
import { Novel } from "../types";
import { ClientNovelProvider } from "./ClientNovelProvider";
import { Registry } from "@/utils";

type Props = PropsWithChildren<{
  novelId: string;
}>;

export async function NovelProvider({ novelId, children }: Props) {
  const { novels } = Registry.get();

  try {
    const novel: Novel = await novels.getNovelById(novelId);
    return <ClientNovelProvider novel={novel}>{children}</ClientNovelProvider>;
  } catch (error) {
    console.error("Failed to fetch novel:", error);
    return children;
  }
}
