import { Stack, Typography } from "@mui/material";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  value: string;
  maxLength?: number;
}>;

export function HelperTextWithCounter({ value, maxLength, children }: Props) {
  const isLengthExceeded = maxLength ? value.length > maxLength : false;

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      justifyContent="space-between"
    >
      {children ?? <span />}
      <Typography
        variant="caption"
        sx={(theme) => ({
          color: isLengthExceeded
            ? theme.palette.error.main
            : theme.palette.text.secondary,
        })}
      >
        {value.length}
        {maxLength ? ` / ${maxLength}` : ""}
      </Typography>
    </Stack>
  );
}

export function TextLengthCounterAdornment({
  value,
  maxLength,
}: {
  value: string;
  maxLength?: number;
}) {
  return (
    <Typography
      position="absolute"
      right={12}
      bottom={4}
      variant="caption"
      noWrap
      display="block"
      alignSelf="flex-end"
      textAlign="right"
      width={"auto"}
      minWidth={70}
      sx={(theme) => ({
        color:
          value.length > (maxLength ?? Infinity)
            ? theme.palette.error.main
            : value.length === (maxLength ?? Infinity)
              ? theme.palette.warning.main
              : "",
      })}
    >
      {value.length} {maxLength ? ` / ${maxLength}` : ""}
    </Typography>
  );
}
