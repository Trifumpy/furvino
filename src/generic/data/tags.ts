import { ColorKey } from "../theme";

export const TAGS = {
  horror: "Horror",
  mystery: "Mystery",
  supernatural: "Supernatural",
  sciFi: "Sci-Fi",
  romance: "Romance",
  politics: "Politics",
  historical: "Historical",
  sliceOfLife: "Slice of Life",
  college: "College",
  fantasy: "Fantasy",
  adventure: "Adventure",
  comingOfAge: "Coming of Age",
  drama: "Drama",
  medieval: "Medieval",
} as const;

export type Tag = keyof typeof TAGS;
export const TAG_COLORS = {
  horror: "red",
  mystery: "purple",
  supernatural: "cyan",
  sciFi: "blue",
  romance: "pink",
  politics: "black",
  historical: "grey",
  sliceOfLife: "green",
  college: "orange",
  fantasy: "purple",
  adventure: "red",
  comingOfAge: "yellow",
  drama: "pink",
  medieval: "brown",
} as const satisfies Record<Tag, ColorKey>;
