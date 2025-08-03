import { Author } from "@/users/types";
import { readFile } from "fs/promises";
import { join } from "path";

type RawAuthor = Author;

export async function getAuthors(): Promise<RawAuthor[]> { 
  const filePath = join(process.cwd(), 'src', 'app', 'api', 'authors', 'data.json');
  const data = await readFile(filePath, 'utf-8');
  const authors: RawAuthor[] = JSON.parse(data);

  return authors;
}

export function postProcessAuthor(author: RawAuthor): Author {
  return {
    ...author,
  };
}