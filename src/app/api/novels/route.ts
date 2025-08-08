import { NextResponse } from "next/server";
import { enrichNovel, getListedNovels, validateNovelData } from "./utils";
import { ensureAdmin, revalidateTags, wrapRoute } from "../utils";
import prisma from "@/utils/db";
import { CreateNovelResponse } from "@/contracts/novels";
import { novelTags } from "@/utils";

export async function GET() {
  const novels = await getListedNovels();

  return NextResponse.json(novels);
}

export const POST = wrapRoute(async (req) => {
  const novelData = await req.json();

  await ensureAdmin();

  const validatedNovel = await validateNovelData(novelData);
  const { id, ...data } = validatedNovel;
  const newNovel = await (
    id 
      ? prisma.novel.upsert({
        where: { id },
        create: data,
        update: data,
      })
      : prisma.novel.create({ data }) 
  );

  revalidateTags(novelTags.list());

  const result = await enrichNovel(newNovel) satisfies CreateNovelResponse;
  return NextResponse.json(result, { status: 201 });
});
