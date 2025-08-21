import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { MAX_NOVEL_FILE_SIZE, PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";
import { Prisma } from "@/generated/prisma";
import { getUploadFolder, saveNovelFile, waitForNodeId } from "../utils";
import { parseMultipartStream, createFileFromParsed, cleanupTempFiles } from "../multipartParser";

type Params = { novelId: string; platform: string };

// Configure route to handle large file uploads (1.5GB)  
export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This is the Next.js equivalent of express.json({ limit: '1500mb' })
// We'll bypass formData() and process the stream directly

export const PUT = wrapRoute<Params>(async (request, { params }) => {
  const { novelId, platform } = await params;

  if (!PLATFORMS.includes(platform as Platform)) {
    throw new BadRequestError("Invalid platform");
  }
  const typedPlatform = platform as Platform;

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  // Handle large file uploads using custom multipart parser (equivalent to express.json({ limit: '1500mb' }))
  let tempFiles: { name: string; filename: string; contentType: string; size: number; tempPath: string; }[] = [];
  try {
    let file: File | null = null;

    // Get content-length from headers for early size validation
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_NOVEL_FILE_SIZE) {
        throw new BadRequestError(`File too large. Maximum size is ${Math.floor(MAX_NOVEL_FILE_SIZE / (1024 * 1024 * 1024))}GB`);
      }
    }

    // Try formData first for smaller files (< 128MB), fallback to custom parser for larger
    try {
      const formData = await request.formData();
      file = formData.get("file") as File | null;
      console.log("✅ Successfully used formData for file:", file?.name, "size:", file?.size);
    } catch (formDataError: unknown) {
      // formData failed due to size limits, use our custom multipart parser
      const errorMessage = formDataError instanceof Error ? formDataError.message : String(formDataError);
      console.log("⚠️ FormData failed (likely due to size), using custom multipart parser:", errorMessage);
      
      try {
        const { files } = await parseMultipartStream(request, MAX_NOVEL_FILE_SIZE);
        tempFiles = files; // Keep reference for cleanup
        
        if (files.length === 0) {
          throw new BadRequestError("No file found in upload");
        }
        
        const uploadedFile = files.find(f => f.name === 'file');
        if (!uploadedFile) {
          throw new BadRequestError("No file field named 'file' found");
        }

        // Convert parsed file to File object
        file = await createFileFromParsed(uploadedFile);
        console.log("✅ Successfully parsed large file using custom parser:", file.name, "size:", file.size);
      } catch (parseError: unknown) {
        const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error("❌ Custom multipart parser failed:", parseError);
        throw new BadRequestError(`File upload failed: ${parseErrorMessage}`);
      }
    }

    if (!file) throw new BadRequestError("File is required");
    if (file.size > MAX_NOVEL_FILE_SIZE) throw new BadRequestError(`File too large. Maximum size is ${Math.floor(MAX_NOVEL_FILE_SIZE / (1024 * 1024 * 1024))}GB`);

    console.log("📁 Processing file:", file.name, "size:", file.size, "type:", file.type);

    const relativePath = getUploadFolder(novelId, typedPlatform);
    const stackPath = await saveNovelFile(relativePath, file);

    const nodeId = await waitForNodeId(stackPath);
    const shareUrl = await StackService.get().shareNode(nodeId);

    // Patch DB field
    const existingFileUrls: Prisma.JsonObject =
      typeof novel.magnetUrls === "object" && novel.magnetUrls !== null
        ? (novel.magnetUrls as Prisma.JsonObject)
        : {};
    const nextFileUrls: Prisma.JsonObject = {
      ...existingFileUrls,
      [typedPlatform]: shareUrl,
    };

    const patched = await prisma.novel.update({
      where: { id: novelId },
      data: {
        magnetUrls: nextFileUrls,
      },
    });

    const result = await enrichNovel(patched);

    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());
    
    console.log("✅ File upload completed successfully:", shareUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("❌ Large file upload error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide specific error messages for different types of failures
    if (errorMessage.includes('413') || errorMessage.includes('Request entity too large')) {
      throw new BadRequestError("File too large. The uploaded file exceeds the server's maximum request size limit of 1.5GB.");
    }
    if (errorMessage.includes('exceeded') && errorMessage.includes('limit')) {
      throw new BadRequestError("File upload failed due to size limits. Maximum file size is 1.5GB.");
    }
    throw error instanceof Error ? error : new Error(errorMessage);
  } finally {
    // Clean up any temporary files
    if (tempFiles.length > 0) {
      await cleanupTempFiles(tempFiles).catch(err => 
        console.warn("⚠️ Failed to cleanup temp files:", err)
      );
    }
  }
});
