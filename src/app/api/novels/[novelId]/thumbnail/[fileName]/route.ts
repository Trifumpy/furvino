import { wrapRoute } from "@/app/api/utils";
import { getNovelThumbnailStream } from "../utils";
import { NextResponse } from "next/server";

type Params = {
  novelId: string;
  fileName: string;
};

export const GET = wrapRoute<Params>(async (_req, { params }) => {
  const { novelId, fileName } = await params;

  const { stream, contentType } = await getNovelThumbnailStream(
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
