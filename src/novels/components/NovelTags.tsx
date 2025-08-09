import { Tag, TAG_COLORS, TAGS } from "@/generic/data";
import { Box, Chip, ChipProps } from "@mui/material";

type Props = {
  tags: string[];
  chipSize?: "small" | "medium";
};

export function NovelTags({ tags, chipSize = "small" }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {tags.map((tag) => (
        <Chip
          key={tag}
          label={TAGS[tag as Tag] || tag}
          size={chipSize}
          color={(TAG_COLORS[tag as Tag] || "default") as ChipProps["color"]}
        />
      ))}
    </Box>
  );
}
