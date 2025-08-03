import { NextResponse } from "next/server";
import { getNovels, postProcessNovel } from "../utils";

export async function GET(request: Request, { params }: { params: { novelId: string } }) {
  const novelId = params.novelId;

  const novels = await getNovels();
  const novel = novels.find(n => n.id === novelId);

  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const result = await postProcessNovel(novel);
  return NextResponse.json(result);
}
