import { NextRequest, NextResponse } from "next/server";
import { getNovel } from "../utils";
import { NextParams } from "../../../types";

type Context = NextParams<{
  novelId: string;
}>;

export async function GET(request: NextRequest, { params }: Context) {
  const { novelId } = await params;

  const novel = await getNovel(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  return NextResponse.json(novel);
}
