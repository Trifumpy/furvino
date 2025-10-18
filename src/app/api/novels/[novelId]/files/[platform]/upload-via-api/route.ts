import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichToListedNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { Prisma } from "@/generated/prisma";
import { authenticate, uploadFile as stackUploadFile, createDirectory, listChildren, getMe, createPublicShare } from "@/utils/services/STACK";
import { SETTINGS } from "@/app/api/settings";
import { sanitizeFilename } from "@/app/api/files";

type Params = { novelId: string; platform: string };

/**
 * POST endpoint for uploading download files via STACK REST API (not WebDAV)
 * File goes through VPS but uses STACK API for better performance than WebDAV
 */
export const PUT = wrapRoute<Params>(async (request, { params }) => {
  const { novelId, platform } = await params;

  if (!PLATFORMS.includes(platform as Platform)) {
    throw new BadRequestError("Invalid platform");
  }
  const typedPlatform = platform as Platform;

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new BadRequestError("No file provided");
  }

  // Authenticate with STACK
  const auth = await authenticate(
    SETTINGS.stack.apiUrl,
    SETTINGS.stack.username,
    SETTINGS.stack.password
  );

  // Navigate to furvino/novels/<novelId>/files/<platform>/ directory
  const { filesNodeID } = await getMe(auth);
  let currentParentID = filesNodeID;

  const pathParts = [SETTINGS.stack.prefix, "novels", novelId, "files", platform];
  for (const dirName of pathParts) {
    const children = await listChildren(auth, currentParentID);
    const existing = children.find((c) => c.name === dirName && c.dir);

    if (existing) {
      currentParentID = existing.id;
    } else {
      currentParentID = await createDirectory(auth, currentParentID, dirName);
    }
  }

  // Upload file using STACK REST API
  const fileName = sanitizeFilename(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const nodeId = await stackUploadFile(auth, currentParentID, fileName, arrayBuffer);

  // Create share for the uploaded file
  const { urlToken, shareId } = await createPublicShare(auth, nodeId);
  // Ensure the share URL has protocol to avoid it being treated as relative path
  const host = SETTINGS.stack.shareHost.startsWith('http')
    ? SETTINGS.stack.shareHost
    : `https://${SETTINGS.stack.shareHost}`;
  const shareUrl = `${host}/s/${urlToken}`;
  console.log(`[Upload] Share created for file ${fileName}: ${shareUrl} (shareId: ${shareId})`);

  // Update database - use raw query for atomic JSON merge to avoid cache issues
  console.log(`[Upload] Attempting to update database. Platform: ${typedPlatform}, URL: ${shareUrl}, NovelId: ${novelId}`);
  
  try {
    const result = await prisma.$queryRaw<Array<{ id: string; downloadUrls: Prisma.JsonValue }>>`
      UPDATE "Novel"
      SET "downloadUrls" = COALESCE("downloadUrls", '{}'::jsonb) || jsonb_build_object(${typedPlatform}, ${shareUrl})
      WHERE "id" = ${novelId}
      RETURNING "id", "downloadUrls"
    ` as Array<{ id: string; downloadUrls: Prisma.JsonValue }>;

    console.log(`[Upload] Query result:`, result);
    
    if (!result || result.length === 0) {
      console.error(`[Upload] No rows returned from update query`);
      throw new Error("Failed to update novel download URLs - no rows returned");
    }

    // Update the novel object with the new downloadUrls
    const patchedNovel = { ...novel, downloadUrls: result[0].downloadUrls };
    
    console.log(`[Upload] Database update complete.`);
    console.log(`[Upload] Patched novel downloadUrls:`, patchedNovel.downloadUrls);

    const enrichedNovel = await enrichToListedNovel(patchedNovel);
    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());
    console.log(`[Upload] Final result downloadUrls:`, enrichedNovel.downloadUrls);
    console.log(`[Upload] Returning JSON response:`, JSON.stringify({ downloadUrls: enrichedNovel.downloadUrls }));
    return NextResponse.json(enrichedNovel, { status: 200 });
  } catch (error) {
    console.error(`[Upload] Database update failed:`, error);
    throw error;
  }
});