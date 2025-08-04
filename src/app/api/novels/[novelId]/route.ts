import { NextResponse } from "next/server";
import { getNovel } from "../utils";

export async function GET(request: Request, { params }: { params: { novelId: string } }) {
  const novelId = params.novelId;

  const novel = await getNovel(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  return NextResponse.json(novel);
}
