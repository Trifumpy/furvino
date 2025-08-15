import { NextParams } from "@/app/types";
import { NovelProvider } from "@/novels/providers";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<
  NextParams<{
    novelId: string;
  }>
>;

export default async function Layout({ children, params }: Props) {
  const { novelId } = await params;

  return <NovelProvider novelId={novelId}>{children}</NovelProvider>;
}
