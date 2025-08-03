import { NextResponse } from 'next/server';
import { getNovels, postProcessNovels } from './utils';

export async function GET() {
  const novels = await getNovels();

  const result = await postProcessNovels(novels);

  return NextResponse.json(result);
}

