import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import { ensureCanUpdateNovelById } from "../../utils";
import { createUploadShareForNovel } from "@/utils/services/STACKShareTokens";
import { SETTINGS } from "@/app/api/settings";

export type GetUploadTokenResponse = {
  shareURLToken: string;
  shareToken: string; // X-ShareToken for authorization
  shareID: number;
  parentNodeID: number;
  expiresAt: number;
  stackApiUrl: string;
};

export const POST = wrapRoute(
  async (request, { params }: { params: Promise<{ novelId: string }> }) => {
    const { novelId } = await params;

    // Verify user has permission to edit this novel
    await ensureCanUpdateNovelById(novelId);

    // Create the share token
    const shareConfig = await createUploadShareForNovel(novelId);

    const response: GetUploadTokenResponse = {
      ...shareConfig,
      stackApiUrl: SETTINGS.stack.apiUrl,
    };

    return NextResponse.json(response, { status: 200 });
  }
);

