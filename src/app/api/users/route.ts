import { NextResponse } from "next/server";
import { getQueryParams, wrapRoute } from "../utils";
import { getAllUsers } from "./utils";
import { GetUserOptions, GetUsersResponse } from "@/contracts/users";

type QueryParams = GetUserOptions;

export const GET = wrapRoute(async (req) => {
  const options = getQueryParams<QueryParams>(req);
  const users = await getAllUsers(options);

  const sanitizedUsers = users.map((user) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, clerkId, ...sanitizedUser } = user;
    return sanitizedUser;
  }) satisfies GetUsersResponse;

  return NextResponse.json(sanitizedUsers, { status: 200 });
})
