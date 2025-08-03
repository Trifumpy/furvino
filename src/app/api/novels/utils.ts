import { Novel } from "@/novels/types";
import { readFile } from "fs/promises";
import { join } from "path";
import { getAuthors } from "../authors/utils";
import { Author } from "@/users/types";

type RawNovel = Omit<Novel, 'comments' | 'stats' | 'ratingsSummary' | 'author'> & {
  authorId: string;
};

export async function getNovels(): Promise<RawNovel[]> { 
  const filePath = join(process.cwd(), 'src', 'app', 'api', 'novels', 'data.json');
  const data = await readFile(filePath, 'utf-8');
  const novels: RawNovel[] = JSON.parse(data);

  return novels;
}

export async function postProcessNovel(novel: RawNovel): Promise<Novel> {
  return await postProcessNovels([novel]).then(novels => novels[0]);
}

export async function postProcessNovels(novels: RawNovel[]): Promise<Novel[]> {
  const authors = await getAuthors();
  const authorMap = new Map(authors.map(author => [author.id, author]));

  return novels.map(novel => postProcessNovel_(novel, authorMap));
}

function postProcessNovel_(novel: RawNovel, authorMap: Map<string, Author>): Novel {
  const processedNovel = {
    ...novel,
    author: authorMap.get(novel.authorId) || {
      id: novel.authorId,
      name: "Unknown Author",
    },
    comments: {
      total: 0,
      recent: [],
    },
    stats: {
      downloads: 0,
      favorites: 0,
      views: 0,
    },
    ratingsSummary: {
      total: 0,
      average: 0,
      recent: [],
    },
  };

  return processedNovel;
}
