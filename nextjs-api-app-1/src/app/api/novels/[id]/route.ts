// filepath: /nextjs-api-app/nextjs-api-app/src/app/api/novels/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = params;
  const novel = await prisma.novel.findUnique({
    where: { id: Number(id) },
  });

  if (!novel) {
    return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
  }

  return NextResponse.json(novel);
}

export async function PUT(request, { params }) {
  const { id } = params;
  const data = await request.json();

  const updatedNovel = await prisma.novel.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json(updatedNovel);
}

export async function DELETE(request, { params }) {
  const { id } = params;

  await prisma.novel.delete({
    where: { id: Number(id) },
  });

  return NextResponse.json({ message: 'Novel deleted successfully' });
}