import { NextResponse } from "next/server";
import { enrichToFullNovel, getAllNovels, validateNovelData } from "./utils";
import { getQueryParams, revalidateTags, wrapRoute } from "../utils";
import prisma from "@/utils/db";
import {
  CreateNovelResponse,
  getNovelsQParamsSchema,
  GetNovelsResponse,
} from "@/contracts/novels";
import { novelTags } from "@/utils";

export const GET = wrapRoute(async (req) => {
  const options = getQueryParams(req, getNovelsQParamsSchema);

  const novels = (await getAllNovels(options)) satisfies GetNovelsResponse;

  return NextResponse.json(novels);
});

export const POST = wrapRoute(async (req) => {
  const novelData = await req.json();

  const validatedNovel = await validateNovelData(novelData);

  const id = validatedNovel.id;
  const data = {
    title: validatedNovel.title,
    authorId: validatedNovel.authorId,
    description: validatedNovel.description,
    snippet: validatedNovel.snippet,
    thumbnailUrl: validatedNovel.thumbnailUrl,
    bannerUrl: validatedNovel.bannerUrl,
    tags: validatedNovel.tags,
    externalUrls: validatedNovel.externalUrls,
    downloadUrls: validatedNovel.downloadUrls,
  };

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

  const result = (await enrichToFullNovel(
    newNovel
  )) satisfies CreateNovelResponse;
  return NextResponse.json(result, { status: 201 });
});
