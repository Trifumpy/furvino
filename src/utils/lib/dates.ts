export type DateInput = string | number | Date;

/**
 * Formats a date in a deterministic way for SSR/CSR using UTC timezone and 24-hour clock.
 * Example output: "Jan 05, 2025, 14:30" (locale en-US, month short)
 */
export function formatDateTimeUtcShort(input: DateInput): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d);
}


