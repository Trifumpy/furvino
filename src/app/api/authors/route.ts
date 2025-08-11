import { NextResponse } from 'next/server';
import { getAuthors, enrichAuthorWithUser, sanitizeAuthor } from './utils';
import { ensureAdmin, getQueryParams, validateRequestBody, wrapRoute } from '../utils';
import { createAuthorSchema, getAuthorsQuerySchema, GetAuthorsResponse } from '@/contracts/users';
import prisma from '@/utils/db';

export const GET = wrapRoute(async (req) => {
  const options = getQueryParams(req, getAuthorsQuerySchema);
  const authors = await getAuthors(options);

  const sanitizedAuthors = authors.map(sanitizeAuthor) satisfies GetAuthorsResponse;

  return NextResponse.json(sanitizedAuthors, { status: 200 });
});

export const POST = wrapRoute(async (req) => {
  await ensureAdmin();

  const data = await validateRequestBody(req, createAuthorSchema);

  const author = await prisma.author.create({ data });

  return NextResponse.json(enrichAuthorWithUser(author, null));
})
