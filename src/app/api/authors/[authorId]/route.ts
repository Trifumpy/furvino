import { NextResponse } from "next/server";
import { getAuthors, postProcessAuthor } from "../utils";

export async function GET(request: Request, { params }: { params: { authorId: string } }) {
  const novelId = params.authorId;

  const novels = await getAuthors();
  const novel = novels.find(n => n.id === novelId);

  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const result = postProcessAuthor(novel);
  return NextResponse.json(result);
}
