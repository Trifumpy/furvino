import { FieldErrors } from "react-hook-form";

export function fieldValidationToRecord(
  errors: FieldErrors | undefined
) {
  if (!errors) return {};

  return Object.entries(errors).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value?.message && typeof value.message === "string") {
        acc[key] = value.message;
      }
      return acc;
    },
    {}
  );
}
