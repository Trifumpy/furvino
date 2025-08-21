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

  // Destructure away unused fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { downloadUrls, externalUrls, galleryItems, ...data } = validatedNovel;

  const updatedNovel = await prisma.novel.update({
    where: { id: novelId },
    data,
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
