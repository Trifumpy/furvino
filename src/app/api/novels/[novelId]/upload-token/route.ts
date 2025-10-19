import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import { ensureCanUpdateNovelById } from "../../utils";

export const POST = wrapRoute(
  async (request, { params }: { params: Promise<{ novelId: string }> }) => {
    const { novelId } = await params;

    // Verify user has permission to edit this novel
    await ensureCanUpdateNovelById(novelId);

    // Direct Stack API uploads are disabled - using VPS WebDAV uploads instead
    return NextResponse.json(
      { error: "Direct Stack uploads are disabled. Using VPS WebDAV uploads instead." },
      { status: 501 }
    );
  }
);

