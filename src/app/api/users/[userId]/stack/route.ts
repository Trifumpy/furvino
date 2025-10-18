import { NextResponse } from "next/server";
import { ensureAdmin, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { sanitizeUser } from "../../utils";
import z from "zod";

const updateStackNameSchema = z.object({
  stackName: z.string().nullable(),
});

export const PATCH = wrapRoute<{ userId: string }>(async (req, { params }) => {
  await ensureAdmin();

  const { userId } = await params;
  const body = await req.json();
  const validated = updateStackNameSchema.parse(body);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      stackName: validated.stackName,
    },
  });

  return NextResponse.json(sanitizeUser(updated));
});

