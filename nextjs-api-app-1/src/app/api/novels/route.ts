// filepath: /nextjs-api-app/nextjs-api-app/src/app/api/novels/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const novels = await prisma.novel.findMany();
  return NextResponse.json(novels);
}

export async function POST(request: Request) {
  const data = await request.json();
  const newNovel = await prisma.novel.create({
    data: {
      title: data.title,
      author: data.author,
      externalUrl: data.externalUrl,
      magnetUrl: data.magnetUrl,
      description: data.description,
      snippet: data.snippet,
      tags: data.tags,
      comments: {
        create: data.comments,
      },
      thumbnailUrl: data.thumbnailUrl,
    },
  });
  return NextResponse.json(newNovel, { status: 201 });
}