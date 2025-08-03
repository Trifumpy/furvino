import { Box, Chip } from "@mui/material";
import { TAG_COLORS } from "./constants";

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
          label={tag}
          size={chipSize}
          color={TAG_COLORS[tag] || "default"}
        />
      ))}
    </Box>
  );
}
