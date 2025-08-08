import { GetMeResponse } from "@/contracts/users";
import { ensureClerkId, wrapRoute } from "../../utils";
import { enrichUser, getOrCreateUserByExternalId } from "../utils";
import { NextResponse } from "next/server";

export const GET = wrapRoute(async () => {
  const { clerkId } = await ensureClerkId();

  const user = await getOrCreateUserByExternalId(clerkId);
  
  const result = await enrichUser(user) satisfies GetMeResponse;
  return NextResponse.json(result, { status: 200 });
});
