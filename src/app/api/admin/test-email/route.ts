import { NextResponse } from "next/server";
import { ensureClerkId, wrapRoute } from "../../utils";
import prisma from "@/utils/db";
import { sendEmail } from "@/utils/email";

export const POST = wrapRoute(async () => {
  const { clerkId } = await ensureClerkId();
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { email: true, username: true } });
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "No email on file for your account" }, { status: 400 });
  }

  await sendEmail({
    to: user.email,
    subject: "Furvino test email",
    html: `<p>Hello${user.username ? ` ${user.username}` : ""}! This is a test email from Furvino.</p>`,
  });

  return NextResponse.json({ ok: true });
});


