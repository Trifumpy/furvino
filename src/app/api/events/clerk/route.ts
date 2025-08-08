import { Webhook } from 'svix'; // Clerk uses svix-style signing
import { headers } from 'next/headers';
import { ClerkEvent } from './types';
import { processEvent } from './utils';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text(); // Read raw text to verify signature
  const headerList = await headers();
  const svixId = headerList.get("svix-id")!;
  const svixTimestamp = headerList.get("svix-timestamp")!;
  const svixSignature = headerList.get("svix-signature")!;

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;
  console.log("Webhook received:", type, data);

  await processEvent(evt);

  // Handle user.created, user.updated, etc.
  return new Response("OK", { status: 200 });
}
