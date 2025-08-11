import { Breakpoint } from "@mui/material";

export type NextParams<T> = {params: Promise<T>};
export type WithId = { id: string | number };
export type MaybeMultiple<T> = T[] | T | null | undefined;

export function isMultiple<T>(
  value: MaybeMultiple<T>
): value is T[] {
  return Array.isArray(value);
}

export type ResponsiveValue<T> =
  | T
  | Partial<Record<Breakpoint, T>>
