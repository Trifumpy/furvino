import { wrapRoute } from "@/app/api/utils";
import { NextResponse } from "next/server";
import z from "zod";
import { assembleAndMoveToStack } from "../../utils";

const completeSchema = z.object({
  totalParts: z.number().int().positive().optional(),
});

export const POST = wrapRoute(async (req, { params }) => {
  const { uploadId } = await params as { uploadId: string };
  const body = await req.json().catch(() => ({}));
  const parsed = completeSchema.parse(body);

  const stackPath = await assembleAndMoveToStack(uploadId, parsed.totalParts);
  return NextResponse.json({ ok: true, stackPath });
});


