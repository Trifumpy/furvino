import { NextResponse } from 'next/server';
import { getAuthors, postProcessAuthor } from './utils';

export async function GET() {
  const authors = await getAuthors();

  const result = authors.map(author => postProcessAuthor(author));

  return NextResponse.json(result);
}

