import { PropsWithChildren } from "react";
import { NovelProvider } from "@/novels/providers/NovelProvider";
import { NextParams } from "@/app/types";

type Props = PropsWithChildren<NextParams<{ novelId: string }>>;

export default async function Layout({ params, children }: Props) {
  const { novelId } = await params;
  return (
    <NovelProvider novelId={novelId}>
      {children}
    </NovelProvider>
  );
}

