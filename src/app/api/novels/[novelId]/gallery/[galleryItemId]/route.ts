import { wrapRoute } from "@/app/api/utils";
import {
  deleteGalleryFile,
} from "../utils";
import { ensureCanUpdateNovel, ensureGetNovel } from "../../../utils";
import {
  DeleteNovelGalleryItemParams,
} from "@/contracts/novels";
import { NextResponse } from "next/server";

type Params = DeleteNovelGalleryItemParams;

export const DELETE = wrapRoute<Params>(async (request, { params }) => {
  const { novelId, galleryItemId } = await params;
  
  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  await deleteGalleryFile(novelId, galleryItemId);

  return NextResponse.json(null, { status: 204 });
});
