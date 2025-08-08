export const novelTags = {
  all: ['novels'],
  novel: (id: string) => [...novelTags.all, `novels:${id}`],
  list: () => [...novelTags.all, 'novels:list'],
} as const;
