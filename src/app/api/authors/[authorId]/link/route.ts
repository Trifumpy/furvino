import { ensureAdmin, validateRequestBody, wrapRoute } from "@/app/api/utils";
import { linkAuthorSchema } from "@/contracts/users";
import { NextResponse } from "next/server";
import { linkAuthor } from "./utils";
import { enrichAuthorWithUser } from "../../utils";

export const PATCH = wrapRoute<{authorId: string}>(async (request, { params }) => {
  await ensureAdmin();

  const { authorId } = await params;
  const body = await validateRequestBody(request, linkAuthorSchema);

  const { author, user } = await linkAuthor(authorId, body.userId);

  const result = enrichAuthorWithUser(author, user);
  return NextResponse.json(result);
});
