import prisma from "@/utils/db";
import { NotFoundError } from "@/app/api/errors";

export async function linkAuthor(authorId: string, userId: string) {
  const author = await prisma.author.findUnique({
    where: { id: authorId },
  });

  if (!author) {
    throw new NotFoundError(`Author with ID ${authorId} not found`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { authorId },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { authorId: null }, // Unlink existing user from author
    }).catch(() => {
      // Handle potential error if user update fails
      console.error(`Failed to unlink user ${existingUser.id} from author ${authorId}`);
    });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { authorId },
  });

  if (!user) {
    throw new NotFoundError(`User with ID ${userId} not found`);
  }

  return {
    author, user
  };
}
