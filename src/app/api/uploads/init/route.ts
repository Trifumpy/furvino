import { wrapRoute } from "@/app/api/utils";
import z from "zod";
import { NextResponse } from "next/server";
import { initUpload, InitUploadResponse } from "../utils";

const initSchema = z.object({
  targetFolder: z.string().min(1),
  filename: z.string().min(1),
  totalSize: z.number().int().positive().optional(),
  partSize: z.number().int().positive().optional(),
});

export const POST = wrapRoute(async (req) => {
  const body = await req.json();
  const parsed = initSchema.parse(body);
  const result: InitUploadResponse = await initUpload(parsed);
  return NextResponse.json(result, { status: 201 });
});


