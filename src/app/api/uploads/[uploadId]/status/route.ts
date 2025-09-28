import { wrapRoute } from "@/app/api/utils";
import { NextResponse } from "next/server";
import { getUploadMeta, listReceivedParts } from "../../utils";

export const GET = wrapRoute(async (_req, { params }) => {
  const { uploadId } = await params as { uploadId: string };
  const meta = await getUploadMeta(uploadId);
  const parts = await listReceivedParts(uploadId);
  return NextResponse.json({ meta, parts });
});


