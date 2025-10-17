import { NextResponse } from "next/server";
import { ensureAdmin, validateRequestBody, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { sanitizeUser } from "../../utils";
import { updateUserModerationSchema } from "@/contracts/users";

export const PATCH = wrapRoute<{ userId: string }>(async (req, { params }) => {
  await ensureAdmin();

  const { userId } = await params;
  const body = await validateRequestBody(req, updateUserModerationSchema);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      banCommentingAndRating:
        body.banCommentingAndRating === undefined
          ? undefined
          : body.banCommentingAndRating,
      banAuthorCreation:
        body.banAuthorCreation === undefined
          ? undefined
          : body.banAuthorCreation,
    },
  });

  return NextResponse.json(sanitizeUser(updated));
});


