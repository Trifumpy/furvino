import { PrismaClient } from "../src/generated/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient()

async function saveJson<T extends object>(fileName: string, data: T[]) {
  const filePath = join(process.cwd(), 'prisma', 'data', `${fileName}.json`);
  const json = JSON.stringify(data, undefined, 2);
  await writeFile(filePath, json, 'utf-8');
}

async function main() {
  const authors = await prisma.author.findMany();
  const novels = await prisma.novel.findMany();

  console.log(`Dumping ${authors.length} authors and ${novels.length} novels...`);
  
  await saveJson('authors', authors);
  await saveJson('novels', novels);
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
