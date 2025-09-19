import { NextResponse } from 'next/server';
import { getAuthors, sanitizeAuthor, enrichAuthorsWithUsers, enrichAuthor } from './utils';
import { ensureAdmin, getQueryParams, validateRequestBody, wrapRoute } from '../utils';
import { createAuthorSchema, getAuthorsQuerySchema, GetAuthorsResponse } from '@/contracts/users';
import prisma from '@/utils/db';

export const GET = wrapRoute(async (req, _ctx) => {
  const options = getQueryParams(req, getAuthorsQuerySchema);
  const authors = await getAuthors(options);
  const listed = enrichAuthorsWithUsers(authors);
  const sanitizedAuthors = listed.map(sanitizeAuthor) satisfies GetAuthorsResponse;

  return NextResponse.json(sanitizedAuthors, { status: 200 });
});

export const POST = wrapRoute(async (req, _ctx) => {
  await ensureAdmin();

  const data = await validateRequestBody(req, createAuthorSchema);

  const author = await prisma.author.create({ data });
  const listed = await enrichAuthor(author);
  return NextResponse.json(sanitizeAuthor(listed));
})
