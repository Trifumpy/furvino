import { NextResponse } from "next/server";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { Prisma } from "@/generated/prisma";
import z from "zod";
import { auth } from "@clerk/nextjs/server";

const upsertRatingSchema = z.object({
  categories: z
    .object({
      plot: z.number().int().min(1).max(5).optional(),
      characters: z.number().int().min(1).max(5).optional(),
      backgroundsUi: z.number().int().min(1).max(5).optional(),
      characterArt: z.number().int().min(1).max(5).optional(),
      music: z.number().int().min(1).max(5).optional(),
      soundEffects: z.number().int().min(1).max(5).optional(),
      emotionalImpact: z.number().int().min(1).max(5).optional(),
    })
    .partial()
    .default({}),
  reason: z.string().max(2000).optional(),
});

export const GET = wrapRoute(async (req, { params }: { params: Promise<{ novelId: string }> }) => {
  const { novelId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '5');

  // Load all ratings to compute combined averages ignoring zeros (treat 0 as not provided)
  const allRatings = await prisma.userRating.findMany({
    where: { novelId },
    select: {
      plot: true,
      characters: true,
      backgroundsUi: true,
      characterArt: true,
      music: true,
      soundEffects: true,
      emotionalImpact: true,
      createdAt: false,
      updatedAt: false,
      id: false,
      novelId: false,
      userId: false,
    },
  });
  const total = allRatings.length;
  const sums = {
    plot: 0,
    characters: 0,
    backgroundsUi: 0,
    characterArt: 0,
    music: 0,
    soundEffects: 0,
    emotionalImpact: 0,
  };
  const counts = { ...sums } as Record<keyof typeof sums, number>;
  Object.keys(counts).forEach((k) => (counts[k as keyof typeof counts] = 0));
  for (const r of allRatings) {
    (Object.keys(sums) as (keyof typeof sums)[]).forEach((k) => {
      const v = r[k];
      if (typeof v === 'number' && v > 0) {
        sums[k] += v;
        counts[k] += 1;
      }
    });
  }
  const categories = {
    plot: counts.plot ? sums.plot / counts.plot : 0,
    characters: counts.characters ? sums.characters / counts.characters : 0,
    backgroundsUi: counts.backgroundsUi ? sums.backgroundsUi / counts.backgroundsUi : 0,
    characterArt: counts.characterArt ? sums.characterArt / counts.characterArt : 0,
    music: counts.music ? sums.music / counts.music : 0,
    soundEffects: counts.soundEffects ? sums.soundEffects / counts.soundEffects : 0,
    emotionalImpact: counts.emotionalImpact ? sums.emotionalImpact / counts.emotionalImpact : 0,
  };
  const combinedSum =
    (counts.plot ? sums.plot : 0) +
    (counts.characters ? sums.characters : 0) +
    (counts.backgroundsUi ? sums.backgroundsUi : 0) +
    (counts.characterArt ? sums.characterArt : 0) +
    (counts.music ? sums.music : 0) +
    (counts.soundEffects ? sums.soundEffects : 0) +
    (counts.emotionalImpact ? sums.emotionalImpact : 0);
  const combinedCount =
    counts.plot +
    counts.characters +
    counts.backgroundsUi +
    counts.characterArt +
    counts.music +
    counts.soundEffects +
    counts.emotionalImpact;
  const overallAverage = combinedCount ? combinedSum / combinedCount : 0;

  const recent = await prisma.userRating.findMany({
    where: { novelId },
    include: { user: { select: { id: true, username: true, avatarUrl: true, authorId: true } } },
    orderBy: { updatedAt: "desc" },
    take: Math.max(1, Math.min(limit, 100)),
  });

  // Optionally include the current user's rating
  const { userId: clerkId } = await auth();
  let mine:
    | {
        id: string;
        novelId: string;
        user: { id: string; username: string; avatarUrl: string | null; authorId: string | null };
        plot: number;
        characters: number;
        backgroundsUi: number;
        characterArt: number;
        music: number;
        soundEffects: number;
        emotionalImpact: number;
        reason: string | null;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;
  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      const myRating = await prisma.userRating.findUnique({
        where: { novelId_userId: { novelId, userId: user.id } },
      });
      if (myRating) {
        mine = {
          id: myRating.id,
          novelId: myRating.novelId,
          user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, authorId: user.authorId },
          plot: myRating.plot,
          characters: myRating.characters,
          backgroundsUi: myRating.backgroundsUi,
          characterArt: myRating.characterArt,
          music: myRating.music,
          soundEffects: myRating.soundEffects,
          emotionalImpact: myRating.emotionalImpact,
          reason: myRating.reason ?? null,
          createdAt: myRating.createdAt.toISOString(),
          updatedAt: myRating.updatedAt.toISOString(),
        };
      }
    }
  }

  return NextResponse.json({
    average: overallAverage,
    total,
    categories,
    recent: recent.map((r) => ({
      id: r.id,
      novelId: r.novelId,
      user: { id: r.user.id, username: r.user.username, avatarUrl: r.user.avatarUrl, authorId: r.user.authorId },
      plot: r.plot,
      characters: r.characters,
      backgroundsUi: r.backgroundsUi,
      characterArt: r.characterArt,
      music: r.music,
      soundEffects: r.soundEffects,
      emotionalImpact: r.emotionalImpact,
      reason: r.reason ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    mine,
  });
});

export const PUT = wrapRoute(async (req, { params }: { params: Promise<{ novelId: string }> }) => {
  const { novelId } = await params;
  const { clerkId } = await ensureClerkId();

  const body = await req.json();
  const parsed = upsertRatingSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data: Prisma.UserRatingUpsertArgs["create"] = {
    novelId,
    userId: user.id,
    value: 0,
    plot: parsed.categories.plot ?? 0,
    characters: parsed.categories.characters ?? 0,
    backgroundsUi: parsed.categories.backgroundsUi ?? 0,
    characterArt: parsed.categories.characterArt ?? 0,
    music: parsed.categories.music ?? 0,
    soundEffects: parsed.categories.soundEffects ?? 0,
    emotionalImpact: parsed.categories.emotionalImpact ?? 0,
    reason: parsed.reason ?? null,
  };

  const updated = await prisma.userRating.upsert({
    where: { novelId_userId: { novelId, userId: user.id } },
    update: data,
    create: data,
  });

  // Recompute combined categories-only average and total count
  const all = await prisma.userRating.findMany({
    where: { novelId },
    select: { plot: true, characters: true, backgroundsUi: true, characterArt: true, music: true, soundEffects: true, emotionalImpact: true },
  });
  const fields: Array<keyof typeof all[number]> = ["plot", "characters", "backgroundsUi", "characterArt", "music", "soundEffects", "emotionalImpact"];
  let sum = 0; let count = 0;
  for (const r of all) {
    for (const f of fields) {
      const v = r[f];
      if (typeof v === 'number' && v > 0) { sum += v; count += 1; }
    }
  }
  const avg = count ? sum / count : 0;
  return NextResponse.json({ average: avg, total: all.length, mine: updated });
});

export const DELETE = wrapRoute(async (_req, { params }: { params: Promise<{ novelId: string }> }) => {
  const { novelId } = await params;
  const { clerkId } = await ensureClerkId();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ ok: true });

  await prisma.userRating.delete({ where: { novelId_userId: { novelId, userId: user.id } } }).catch(() => undefined);
  const all = await prisma.userRating.findMany({
    where: { novelId },
    select: { plot: true, characters: true, backgroundsUi: true, characterArt: true, music: true, soundEffects: true, emotionalImpact: true },
  });
  const fields: Array<keyof typeof all[number]> = ["plot", "characters", "backgroundsUi", "characterArt", "music", "soundEffects", "emotionalImpact"];
  let sum = 0; let count = 0;
  for (const r of all) {
    for (const f of fields) {
      const v = r[f];
      if (typeof v === 'number' && v > 0) { sum += v; count += 1; }
    }
  }
  const avg = count ? sum / count : 0;
  return NextResponse.json({ average: avg, total: all.length });
});


