import { Tag, TAG_COLORS, TAGS } from "@/generic/data";
import { toTitleCase } from "@lib/strings";
import { Chip, ChipProps } from "@mui/material";

type Props = Omit<ChipProps, "color" | "children"> & {
  tag: string;
};

export function NovelTag({ tag, ...props }: Props) {
  return (
    <Chip
      key={tag}
      label={TAGS[tag as Tag] || toTitleCase(tag)}
      size={props.size || "small"}
      color={(TAG_COLORS[tag as Tag] || "default") as ChipProps["color"]}
      {...props}
    />
  );
}
