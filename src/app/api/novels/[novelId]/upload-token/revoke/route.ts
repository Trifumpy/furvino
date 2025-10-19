import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import { ensureCanUpdateNovelById } from "@/app/api/novels/utils";

export const POST = wrapRoute(
  async (request, { params }: { params: Promise<{ novelId: string }> }) => {
    const { novelId } = await params;

    // Verify user has permission to edit this novel
    await ensureCanUpdateNovelById(novelId);

    // Direct Stack API uploads are disabled - just return success
    return NextResponse.json({ success: true }, { status: 200 });
  }
);

