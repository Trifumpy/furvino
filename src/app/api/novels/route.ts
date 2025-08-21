import { NextResponse } from "next/server";
import { enrichToListedNovel, getAllNovels, validateNovelData } from "./utils";
import { getQueryParams, revalidateTags, wrapRoute } from "../utils";
import prisma from "@/utils/db";
import { CreateNovelResponse, getNovelsQParamsSchema, GetNovelsResponse } from "@/contracts/novels";
import { novelTags } from "@/utils";

export const GET = wrapRoute(async (req) => {
  const options = getQueryParams(req, getNovelsQParamsSchema); 

  const novels = await getAllNovels(options) satisfies GetNovelsResponse;

  return NextResponse.json(novels);
});

export const POST = wrapRoute(async (req) => {
  const novelData = await req.json();

  const validatedNovel = await validateNovelData(novelData);
  
  // Destructure away unused fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, galleryItems, downloadUrls, externalUrls, ...data } = validatedNovel;

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

  const result = await enrichToListedNovel(newNovel) satisfies CreateNovelResponse;
  return NextResponse.json(result, { status: 201 });
});
