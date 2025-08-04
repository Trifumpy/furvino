import { Author } from "@/users/types";
import prisma from "@/utils/db";

type RawAuthor = Author;

export async function getAuthors(): Promise<RawAuthor[]> {
  const authors = await prisma.author.findMany()

  return authors;
}

export function postProcessAuthor(author: RawAuthor): Author {
  return {
    ...author,
  };
}