import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import { ensureCanUpdateNovelById } from "../../../utils";
import { revokeShare } from "@/utils/services/STACKShareTokens";

export type RevokeUploadTokenBody = {
  shareID: number;
};

export const POST = wrapRoute(
  async (request, { params }: { params: Promise<{ novelId: string }> }) => {
    const { novelId } = await params;

    // Verify user has permission to edit this novel
    await ensureCanUpdateNovelById(novelId);

    const body = (await request.json()) as RevokeUploadTokenBody;
    const { shareID } = body;

    if (!shareID || !Number.isFinite(shareID)) {
      return NextResponse.json(
        { error: "Invalid shareID" },
        { status: 400 }
      );
    }

    // Revoke the share
    await revokeShare(shareID);

    return NextResponse.json({ success: true }, { status: 200 });
  }
);

