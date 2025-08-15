import { NextParams } from "@/app/types";
import { AuthorProvider } from "@/users/providers";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<
  NextParams<{
    authorId: string;
  }>
>;

export default async function Layout({ children, params }: Props) {
  const { authorId } = await params;

  return <AuthorProvider authorId={authorId}>{children}</AuthorProvider>;
}
