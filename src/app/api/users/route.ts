import { NextResponse } from "next/server";
import { getQueryParams, wrapRoute } from "../utils";
import { getAllUsers, sanitizeUser } from "./utils";
import { getUserOptionsSchema, GetUsersResponse } from "@/contracts/users";

export const GET = wrapRoute(async (req, _ctx) => {
  const options = getQueryParams(req, getUserOptionsSchema);
  const users = await getAllUsers(options);

  const sanitizedUsers = users.map(sanitizeUser) satisfies GetUsersResponse;

  return NextResponse.json(sanitizedUsers, { status: 200 });
})
