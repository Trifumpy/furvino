import { wrapRoute } from "@/app/api/utils";
import { NextResponse } from "next/server";
import { getNovelGalleryStream } from "../utils";

type Params = {
  novelId: string;
  fileName: string;
};

export const GET = wrapRoute<Params>(async (_req, { params }) => {
  const { novelId, fileName } = await params;

  const { stream, contentType } = await getNovelGalleryStream(
    novelId,
    fileName
  );

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Encourage long-lived browser caching; URL includes a version param for busting
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
