import { wrapRoute } from "@/app/api/utils";
import { NextResponse } from "next/server";
import { writeUploadPart } from "../../utils";

export const PUT = wrapRoute(async (req, { params }) => {
  const { uploadId } = await params as { uploadId: string };
  const partStr = req.nextUrl.searchParams.get("part");
  if (!partStr) {
    return NextResponse.json({ error: "Missing part query param" }, { status: 400 });
  }
  const partNumber = parseInt(partStr, 10);
  if (!Number.isFinite(partNumber) || partNumber <= 0) {
    return NextResponse.json({ error: "Invalid part" }, { status: 400 });
  }

  if (!req.body) {
    return NextResponse.json({ error: "Missing request body" }, { status: 400 });
  }

  await writeUploadPart(uploadId, partNumber, req.body);
  return NextResponse.json({ ok: true });
});


