export type NovelColorSource = {
  foregroundColorHex?: string | null;
  foregroundTextColorHex?: string | null;
  buttonBgColorHex?: string | null;
};

export function getNovelColors(novelLike?: unknown): {
  foregroundColorHex: string;
  foregroundTextColorHex: string;
  buttonBgColorHex: string;
  buttonTextColorHex: string;
} {
  const data = (novelLike as Partial<NovelColorSource>) || {};

  const foregroundColorHex = data.foregroundColorHex || "#121212";
  const foregroundTextColorHex = data.foregroundTextColorHex || "#ffffff";
  const buttonBgColorHex = data.buttonBgColorHex || foregroundColorHex;
  const buttonTextColorHex = foregroundTextColorHex;

  return { foregroundColorHex, foregroundTextColorHex, buttonBgColorHex, buttonTextColorHex };
}


