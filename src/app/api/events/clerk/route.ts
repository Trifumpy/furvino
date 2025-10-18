import { Webhook } from 'svix'; // Clerk uses svix-style signing
import { headers } from 'next/headers';
import { ClerkEvent } from './types';
import { processEvent } from './utils';
import { SETTINGS } from '../../settings';

export async function POST(req: Request) {
  const payload = await req.text(); // Read raw text to verify signature
  const headerList = await headers();
  const svixId = headerList.get("svix-id")!;
  const svixTimestamp = headerList.get("svix-timestamp")!;
  const svixSignature = headerList.get("svix-signature")!;

  const wh = new Webhook(SETTINGS.clerk.webhookSecret);

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

  const { type } = evt;
  console.log("Webhook received:", type);

  try {
    await processEvent(evt);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error processing Clerk webhook:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook processing failed: ${errorMessage}`, { status: 500 });
  }
}
