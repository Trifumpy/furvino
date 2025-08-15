import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserByExternalId } from "./users";
import { auth } from "@clerk/nextjs/server";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  RoleRequiredError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import z from "zod";
import { NextParams } from "../types";
import { revalidateTag } from "next/cache";

export async function ensureClerkId(): Promise<{ clerkId: string }> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new UnauthorizedError("User is not authenticated");
  }

  return { clerkId };
}

export async function ensureAdmin() {
  const { clerkId } = await ensureClerkId();
  const isAdmin = await checkIfUserIsAdmin(clerkId);

  if (!isAdmin) {
    throw new RoleRequiredError("admin");
  }
}

export async function checkIfUserIsAdmin(clerkId: string): Promise<boolean> {
  const user = await getOrCreateUserByExternalId(clerkId);
  return user.roles.includes("admin");
}

export function validateSchema<T>(data: unknown, schema: z.ZodType<T>): T {
  const result = (
    schema instanceof z.ZodObject ? schema.strip() : schema
  ).safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  return result.data as T;
}

export async function validateRequestBody<T>(
  request: NextRequest | Request,
  schema: z.ZodType<T>
): Promise<T> {
  const data = await request.json();
  const result = await schema.safeParseAsync(data);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  return result.data;
}

export function handleError(error: unknown) {
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const internalError =
    error instanceof Error ? error : new Error(String(error));

  console.error("Internal Server Error:", error);
  return NextResponse.json({ error: internalError.message }, { status: 500 });
}

export function wrapRoute<
  TParams extends Record<string, string> | never = never,
>(
  handler: (
    req: NextRequest,
    context: TParams extends never ? never : NextParams<TParams>
  ) => Promise<Response>
): (
  req: NextRequest,
  context: TParams extends never ? never : NextParams<TParams>
) => Promise<Response> {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

const fixedValueMap = new Map([
  ["", true],
  ["true", true],
  ["false", false],
]);
export function getQueryParams<T extends Record<string, unknown>>(
  req: NextRequest,
  schema: z.ZodType<T>
): T {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error("Schema must be a ZodObject");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = {} as Record<string, any>;
  for (const key of Object.keys(schema.shape)) {
    const valueSchema = schema.shape[key];
    if (
      valueSchema instanceof z.ZodBoolean ||
      (valueSchema instanceof z.ZodOptional &&
        valueSchema.def.innerType instanceof z.ZodBoolean)
    ) {
      const queryValue = req.nextUrl.searchParams.get(key);
      if (queryValue) {
        const boolValue = fixedValueMap.get(queryValue);
        if (boolValue !== undefined) {
          result[key] = boolValue as T[keyof T];
        } else {
          throw new ValidationError(
            `Invalid value for query parameter "${key}": expected boolean, received "${queryValue}"`
          );
        }

      }
    }

    const value = req.nextUrl.searchParams.get(key);
    if (!value) {
      continue;
    }

    const parsed = schema.shape[key].safeParse(value);
    if (parsed.success) {
      result[key] = parsed.data;
    } else {
      throw new ValidationError(
        `Invalid value for query parameter "${key}": ${parsed.error.message}`
      );
    }
  }
  return result as T;
}

export function revalidateTags(tags: readonly string[]) {
  if (typeof revalidateTag === "function") {
    tags.forEach((tag) => revalidateTag(tag));
  } else {
    console.warn("revalidateTag is not available, skipping tag revalidation");
  }
}
