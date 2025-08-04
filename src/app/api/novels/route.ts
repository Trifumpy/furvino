import { NextResponse } from 'next/server';
import { getNovels } from './utils';

export async function GET() {
  const novels = await getNovels();

  return NextResponse.json(novels);
}

