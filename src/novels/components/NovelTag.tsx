import { Tag, TAG_COLORS, TAGS } from "@/generic/data";
import { toTitleCase } from "@lib/strings";
import { Chip, ChipProps } from "@mui/material";

type Props = Omit<ChipProps, "color" | "children"> & {
  tag: string;
  bgColor?: string;
  textColor?: string;
};

export function NovelTag({ tag, bgColor, textColor, ...props }: Props) {
  const computedColor = (TAG_COLORS[tag as Tag] || "default") as ChipProps["color"];
  return (
    <Chip
      key={tag}
      label={TAGS[tag as Tag] || toTitleCase(tag)}
      size={props.size || "small"}
      color={bgColor ? undefined : computedColor}
      sx={{
        bgcolor: bgColor,
        color: textColor,
        '& .MuiChip-label': { color: textColor },
      }}
      {...props}
    />
  );
}
