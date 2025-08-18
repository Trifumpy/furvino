export const novelTags = {
  all: ['novels'],
  novel: (id: string) => [...novelTags.all, `novels:${id}`],
  list: () => [...novelTags.all, 'novels:list'],
} as const;

export const authorTags = {
  all: ['authors'],
  author: (id: string) => [...authorTags.all, `authors:${id}`],
  list: () => [...authorTags.all, 'authors:list'],
} as const;
