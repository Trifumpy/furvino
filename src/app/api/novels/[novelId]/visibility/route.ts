import { NextResponse } from "next/server";
import { ensureCanUpdateNovelById } from "../../utils";
import prisma from "@/utils/db";
import z from "zod";
import { revalidateTags, wrapRoute } from "../../../utils";
import { novelTags } from "@/utils";
import { enrichToFullNovel } from "../../utils";

const bodySchema = z.object({ isHidden: z.boolean() });

export const PUT = wrapRoute(async (req, { params }) => {
  const { novelId } = await params as { novelId: string };
  await ensureCanUpdateNovelById(novelId);

  const body = await req.json();
  const { isHidden } = bodySchema.parse(body);

  const updated = await prisma.novel.update({
    where: { id: novelId },
    data: { isHidden },
  });

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());

  const full = await enrichToFullNovel(updated);
  return NextResponse.json(full, { status: 200 });
});


