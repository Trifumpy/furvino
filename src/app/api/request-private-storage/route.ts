import { NextResponse } from "next/server";
import { ensureClerkId, wrapRoute } from "../utils";
import prisma from "@/utils/db";
import { sendEmail } from "@/utils/email";
import z from "zod";

const requestSchema = z.object({
  useForPrivateReleases: z.boolean(),
  useAsAlternativeUpload: z.boolean(),
  storageNeeded: z.number().min(1).max(999),
  additionalComments: z.string().optional(),
});

export const POST = wrapRoute(async (req) => {
  const { clerkId } = await ensureClerkId();
  const user = await prisma.user.findUnique({ 
    where: { clerkId }, 
    select: { email: true, username: true, authorId: true } 
  });
  
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  if (!user.authorId) {
    return NextResponse.json({ ok: false, error: "You must be an author to request private storage" }, { status: 403 });
  }

  const body = await req.json();
  const validated = requestSchema.parse(body);

  await sendEmail({
    to: "team@furvino.com",
    subject: `STACK request for ${user.username}`,
    html: `
      <h2>STACK Storage Request</h2>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      
      <h3>Request Details</h3>
      <p><strong>Plan to use for private releases (e.g. Patreon):</strong> ${validated.useForPrivateReleases ? 'Yes' : 'No'}</p>
      <p><strong>Plan to use as alternative to uploading to Furvino:</strong> ${validated.useAsAlternativeUpload ? 'Yes' : 'No'}</p>
      <p><strong>Storage needed:</strong> ${validated.storageNeeded} GiB</p>
      ${validated.additionalComments ? `<p><strong>Additional comments:</strong><br/>${validated.additionalComments.replace(/\n/g, '<br/>')}</p>` : ''}
    `,
    text: `STACK Storage Request\n\nUsername: ${user.username}\nEmail: ${user.email}\n\nRequest Details:\n` +
          `Plan to use for private releases (e.g. Patreon): ${validated.useForPrivateReleases ? 'Yes' : 'No'}\n` +
          `Plan to use as alternative to uploading to Furvino: ${validated.useAsAlternativeUpload ? 'Yes' : 'No'}\n` +
          `Storage needed: ${validated.storageNeeded} GiB\n` +
          `${validated.additionalComments ? `Additional comments:\n${validated.additionalComments}\n` : ''}`,
  });

  return NextResponse.json({ ok: true });
});

