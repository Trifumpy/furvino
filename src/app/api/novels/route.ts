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
  
  // Persist allowed fields. Keep galleryItems out of this handler.
  const { id, galleryItems, ...rest } = validatedNovel as typeof validatedNovel & {
    galleryItems?: unknown;
  };

  const data = {
    title: rest.title,
    authorId: rest.authorId,
    description: rest.description,
    snippet: rest.snippet,
    thumbnailUrl: rest.thumbnailUrl,
    bannerUrl: rest.bannerUrl,
    tags: rest.tags,
    externalUrls: rest.externalUrls as unknown as object | undefined,
    downloadUrls: rest.downloadUrls as unknown as object | undefined,
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

  const result = await enrichToListedNovel(newNovel) satisfies CreateNovelResponse;
  return NextResponse.json(result, { status: 201 });
});
