import { wrapRoute } from "@/app/api/utils";
import z from "zod";
import { NextResponse } from "next/server";
import { assembleAndMoveToStack } from "../../utils";

const completeSchema = z.object({
  totalParts: z.number().int().positive(),
});

type Params = { uploadId: string };

export const POST = wrapRoute<Params>(async (req, { params }) => {
  const { uploadId } = await params;
  const body = await req.json();
  const { totalParts } = completeSchema.parse(body);

  const { stackPath, shareUrl } = await assembleAndMoveToStack(uploadId, totalParts);
  console.log(`[Upload] Completed ${uploadId}: ${stackPath}`);

  return NextResponse.json({ ok: true, stackPath, shareUrl }, { status: 200 });
});


