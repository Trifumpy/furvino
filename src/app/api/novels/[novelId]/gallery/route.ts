import { wrapRoute } from "@/app/api/utils";
import {
  ensureCanUploadToGallery,
  uploadGalleryFile,
  validateGalleryFile,
} from "./utils";
import { enrichGalleryItem } from "../../utils";
import { CreateNovelGalleryItemParams, CreateNovelGalleryItemResponse } from "@/contracts/novels";
import { NextResponse } from "next/server";

type Params = CreateNovelGalleryItemParams;

export const POST = wrapRoute<Params>(async (request, { params }) => {
  const { novelId } = await params;
  const formData = await request.formData();
  const file = formData.get("image") as File;
  const requestedSlot = formData.get("slot");

  const validatedFile = validateGalleryFile(file);
  await ensureCanUploadToGallery(novelId);

  const data = await uploadGalleryFile(
    novelId,
    validatedFile,
    typeof requestedSlot === "string" ? Number(requestedSlot) : undefined
  );
  const result = enrichGalleryItem(
    data
  ) satisfies CreateNovelGalleryItemResponse;

  return NextResponse.json(result, { status: 201 });
});
