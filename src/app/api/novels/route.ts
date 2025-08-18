import { NextResponse } from "next/server";
import { enrichNovel, getAllNovels, validateNovelData } from "./utils";
import { ensureAdmin, getQueryParams, revalidateTags, wrapRoute } from "../utils";
import prisma from "@/utils/db";
import { CreateNovelResponse, getNovelsQParamsSchema } from "@/contracts/novels";
import { novelTags } from "@/utils";

export const GET = wrapRoute(async (req) => {
  const options = getQueryParams(req, getNovelsQParamsSchema); 

  const novels = await getAllNovels(options);

  return NextResponse.json(novels);
});

export const POST = wrapRoute(async (req) => {
  const novelData = await req.json();

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
