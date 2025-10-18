import { NextResponse } from "next/server";
import { ensureAdmin, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { sanitizeUser } from "../../../utils";
import { sendEmail } from "@/utils/email";
import z from "zod";

const assignStackWithEmailSchema = z.object({
  stackName: z.string().min(1, "STACK name is required"),
  stackUsername: z.string().min(1, "STACK username is required"),
  stackPassword: z.string().min(1, "STACK password is required"),
  emailTemplate: z.string().min(1, "Email template is required"),
});

export const POST = wrapRoute<{ userId: string }>(async (req, { params }) => {
  await ensureAdmin();

  const { userId } = await params;
  const body = await req.json();
  const validated = assignStackWithEmailSchema.parse(body);

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true },
  });

  if (!user || !user.email) {
    return NextResponse.json(
      { error: "User not found or has no email" },
      { status: 404 }
    );
  }

  // Update user with STACK name
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      stackName: validated.stackName,
    },
  });

  // Replace placeholders in email template
  const emailContent = validated.emailTemplate
    .replace(/\{\{username\}\}/g, validated.stackUsername)
    .replace(/\{\{password\}\}/g, validated.stackPassword);

  // Send email to user
  await sendEmail({
    to: user.email,
    subject: "Your STACK Storage Access - Furvino",
    html: emailContent,
  });

  return NextResponse.json(sanitizeUser(updated));
});

