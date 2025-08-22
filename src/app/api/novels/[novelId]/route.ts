import { NextResponse } from "next/server";
import { deleteNovel, enrichToFullNovel, enrichToListedNovel, ensureCanUpdateNovel, ensureCanUpdateNovelById, ensureGetNovel, validateNovelData } from "../utils";
import { evictTags, revalidateTags, wrapRoute } from "../../utils";
import prisma from "@/utils/db";
import { GetNovelParams, GetNovelResponse, UpdateNovelParams, UpdateNovelResponse } from "@/contracts/novels";
import { novelTags } from "@/utils";

export const GET = wrapRoute<GetNovelParams>(async (request, { params }) => {
  const { novelId } = await params;

  const novel = await ensureGetNovel(novelId);

  const enrichedNovel = await enrichToFullNovel(novel) satisfies GetNovelResponse;
  return NextResponse.json(enrichedNovel);
})

export const PUT = wrapRoute<UpdateNovelParams>(async (request, { params }) => {
  const { novelId } = await params;

  // Ensure the novel exists before updating
  const existing = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(existing);

  const novelData = await request.json();
  // Assuming validateNovelData is a function that validates the novel data
  const validatedNovel = await validateNovelData(novelData);

  if (validatedNovel.id && validatedNovel.id !== novelId) {
    return NextResponse.json({ error: "Novel ID mismatch" }, { status: 400 });
  }

  // Persist allowed fields. Keep galleryItems out of this handler.
  const { galleryItems, ...rest } = validatedNovel as typeof validatedNovel & {
    galleryItems?: unknown;
  };

  const updatedNovel = await prisma.novel.update({
    where: { id: novelId },
    data: {
      // scalar/simple fields
      title: rest.title,
      authorId: rest.authorId,
      description: rest.description,
      snippet: rest.snippet,
      thumbnailUrl: rest.thumbnailUrl,
      bannerUrl: rest.bannerUrl,
      tags: rest.tags,
      // JSON fields we want to persist
      externalUrls: rest.externalUrls as unknown as object | undefined,
      downloadUrls: rest.downloadUrls as unknown as object | undefined,
    },
  });
  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());

  const novel = await enrichToListedNovel(updatedNovel) satisfies UpdateNovelResponse;

  return NextResponse.json(novel, { status: 200 });
});

export const DELETE = wrapRoute<GetNovelParams>(async (_unused, { params }) => {
  const { novelId } = await params;

  await ensureCanUpdateNovelById(novelId);
  await deleteNovel(novelId);

  evictTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());

  return new NextResponse(null, { status: 204 });
});
