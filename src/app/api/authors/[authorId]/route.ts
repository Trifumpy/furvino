import { NextRequest, NextResponse } from "next/server";
import { getAuthors, postProcessAuthor } from "../utils";
import { NextParams } from "../../../types";

type Context = NextParams<{
  authorId: string;
}>;

export async function GET(request: NextRequest, { params }: Context) {
  const { authorId } = await params;

  const authors = await getAuthors();
  const author = authors.find((n) => n.id === authorId);

  if (!author) {
    return NextResponse.json({ error: "Author not found" }, { status: 404 });
  }

  const result = postProcessAuthor(author);
  return NextResponse.json(result);
}
