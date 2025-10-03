import { NextResponse } from "next/server";
import { wrapRoute } from "../../../../utils";
import prisma from "@/utils/db";
import { ensureCanUpdateNovelById } from "../../../utils";
import { novelTags } from "@/utils";
import { revalidateTags } from "../../../../utils";

export const DELETE = wrapRoute(async (_req, { params }: { params: Promise<{ novelId: string; updateId: string }> }) => {
  const { novelId, updateId } = await params;

  await ensureCanUpdateNovelById(novelId);

  await prisma.novelUpdate.delete({ where: { id: updateId, novelId } }).catch(() => undefined);

  revalidateTags(novelTags.novel(novelId));
  return new NextResponse(null, { status: 204 });
});


