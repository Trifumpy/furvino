import { Registry } from "@/utils";
import { PropsWithChildren } from "react";
import { ClientAuthorProvider } from "./ClientAuthorProvider";

type Props = PropsWithChildren<{
  authorId: string;
}>;

export async function AuthorProvider({ authorId, children }: Props) {
  const { authors } = Registry.get();

  try {
    const author = await authors.getAuthorById(authorId);
    return (
      <ClientAuthorProvider author={author}>{children}</ClientAuthorProvider>
    );
  } catch (error) {
    console.error("Failed to fetch author:", error);
    return children;
  }
}
