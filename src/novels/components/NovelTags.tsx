import { Box } from "@mui/material";
import { NovelTag } from "./NovelTag";

type Props = {
  tags: string[];
  chipSize?: "small" | "medium";
};

export function NovelTags({ tags, chipSize = "small" }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {tags.map((tag) => (
        <NovelTag tag={tag} key={tag} size={chipSize} />
      ))}
    </Box>
  );
}
