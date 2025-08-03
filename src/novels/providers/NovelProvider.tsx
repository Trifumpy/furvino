import { PropsWithChildren } from "react";
import { Novel } from "../types";
import { ClientNovelProvider } from "./ClientNovelProvider";

type Props = PropsWithChildren<{
  novelId: string;
}>;

export async function NovelProvider({ novelId, children }: Props) {
  try {
    const novel: Novel = await fetch(
      `http://localhost:3000/api/novels/${novelId}`
    ).then((res) => res.json());
    return <ClientNovelProvider novel={novel}>{children}</ClientNovelProvider>;
  } catch (error) {
    console.error("Failed to fetch novel:", error);
    return children;
  }
}
