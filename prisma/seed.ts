import type { AuthorForCreate, NovelForCreate } from "./types"; 
import { PrismaClient } from "../src/generated/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient()

async function loadJson<T>(fileName: string) {
  const filePath = join(process.cwd(), 'prisma', `${fileName}.json`);
  const json = await readFile(filePath, 'utf-8');
  const result: T[] = JSON.parse(json);
  return result;
}

async function main() {
  const authors = await loadJson<AuthorForCreate>('authors');
  const novels = await loadJson<NovelForCreate>('novels');

  console.log(`Seeding ${authors.length} authors and ${novels.length} novels...`);

  await Promise.all(
    authors.map(author =>
      prisma.author.create({
        data: author,
      }).then(() => console.log(`Author ${author.name} created`))
    )
  );
  await Promise.all(
    novels.map(novel =>
      prisma.novel.create({
        data: novel,
      }).then(() => console.log(`Novel ${novel.title} created`))
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
