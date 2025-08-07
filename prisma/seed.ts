import type { AuthorForCreate, NovelForCreate } from "./types"; 
import { PrismaClient } from "../src/generated/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient()

async function loadJson<T>(fileName: string) {
  const filePath = join(process.cwd(), 'prisma', 'data', `${fileName}.json`);
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
      prisma.author.upsert({
        create: author,
        update: author,
        where: { id: author.id ? author.id : undefined }, // Use id if available, otherwise create new
      })
      .then(() => console.log(`Author ${author.name} created`))
      .catch(err => console.error(`Error creating author ${author.name}:`, err))
    )
  );
  await Promise.all(
    novels.map(novel =>
      prisma.novel.upsert({
        create: novel,
        update: novel,
        where: { id: novel.id ? novel.id : undefined }, // Use id if available, otherwise create new
      })
      .then(() => console.log(`Novel ${novel.title} created`))
      .catch(err => console.error(`Error creating novel ${novel.title}:`, err))
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
