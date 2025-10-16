import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { ensureCanUpdateNovelById, enrichToFullNovel } from "@/app/api/novels/utils";
import { novelLayoutSchema, GetNovelLayoutParams, GetNovelLayoutResponse, UpdateNovelLayoutParams, UpdateNovelLayoutBody, UpdateNovelLayoutResponse } from "@/contracts/novels";
import { validateSchema } from "@/app/api/utils";
import { novelTags } from "@/utils";
import { revalidateTags } from "@/app/api/utils";

export const GET = wrapRoute<GetNovelLayoutParams>(async (_req, { params }) => {
  const { novelId } = await params;
  const novel = await prisma.novel.findUnique({ where: { id: novelId }, select: { pageLayout: true } });
  const result = (novel?.pageLayout ?? null) as GetNovelLayoutResponse;
  return NextResponse.json(result, { status: 200 });
});

export const PUT = wrapRoute<UpdateNovelLayoutParams>(async (req, { params }) => {
  const { novelId } = await params;
  await ensureCanUpdateNovelById(novelId);

  const body = await req.json();
  const layout = validateSchema(body, novelLayoutSchema) as UpdateNovelLayoutBody;

  const updated = await prisma.novel.update({
    where: { id: novelId },
    data: { pageLayout: layout as unknown as object },
  });

  revalidateTags(novelTags.novel(novelId));
  const enriched = (await enrichToFullNovel(updated)) satisfies UpdateNovelLayoutResponse;
  return NextResponse.json(enriched, { status: 200 });
});

