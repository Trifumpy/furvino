import { NextResponse } from "next/server";
import { getAuthor, enrichAuthorWithUser } from "../utils";
import { wrapRoute } from "../../utils";

export const GET = wrapRoute<{ authorId: string }>(
  async (req, { params }) => {
    const { authorId } = await params;

    const author = await getAuthor(authorId);

    const result = enrichAuthorWithUser(author, author.user ?? null);
    return NextResponse.json(result);
  }
);
