import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import path from "path";
import { sanitizeFilename, uploadFileToStack, readFileFromStack } from "@/app/api/files";
import prisma from "@/utils/db";
import { SETTINGS } from "@/app/api/settings";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";

const MAX_NOVEL_FILE_SIZE = 128 * 1024 * 1024; // 128MB

export const PUT = wrapRoute(async (request, { params }) => {
  const { novelId, platform } = await params as { novelId: string; platform: string };

  if (!PLATFORMS.includes(platform as any)) {
    throw new BadRequestError("Invalid platform");
  }

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw new BadRequestError("File is required");
  if (file.size > MAX_NOVEL_FILE_SIZE) throw new BadRequestError("File too large");

  const sanitizedName = sanitizeFilename(file.name);
  const stackRelativePath = path.join("novels", novelId, "files", platform, sanitizedName);

  // Save to mounted stack
  await uploadFileToStack(stackRelativePath, file);

  // Share via STACK API
  const buffer = await readFileFromStack(stackRelativePath);
  const stack = new StackService(SETTINGS.stack.apiUrl, SETTINGS.stack.username, SETTINGS.stack.password);
  const shareUrl = await stack.uploadAndShareByRelativePath(stackRelativePath, buffer);

  // Patch DB field
  const patched = await prisma.novel.update({
    where: { id: novelId },
    data: {
      magnetUrls: {
        ...(novel.magnetUrls ?? {}),
        [platform]: shareUrl,
      } as any,
    },
  });

  const result = await enrichNovel(patched);

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});


