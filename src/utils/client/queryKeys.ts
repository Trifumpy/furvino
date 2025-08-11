export const userKeys = {
  all: ['users'],
  me: () => [...userKeys.all, 'me'],
  user: (userId: string) => [...userKeys.all, userId],
} as const;

export const authorKeys = {
  all: ['authors'],
  author: (authorId: string) => [...authorKeys.all, authorId],
}
