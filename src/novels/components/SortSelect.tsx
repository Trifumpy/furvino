"use client";

import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

const OPTIONS: Array<{ value: string; label: string; disabled?: boolean }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "lastUpdated", label: "Last updated" },
  { value: "mostViewed", label: "Most viewed" },
  { value: "leastViewed", label: "Least viewed" },
  { value: "mostRatings", label: "Most ratings" },
  { value: "highestRating", label: "Highest rating" },
  { value: "lowestRating", label: "Lowest rating" },
  { value: "mostDiscussed", label: "Most discussed" },
  { value: "titleAsc", label: "Alphabetical A–Z" },
  { value: "titleDesc", label: "Alphabetical Z–A" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("sort") || "newest";

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    router.push(`${pathname}?${params.toString()}`);
  };

  const labelId = useMemo(() => `sort-select-label`, []);

  return (
    <FormControl size="medium" sx={{ minWidth: 200 }}>
      <InputLabel id={labelId}>Sort by</InputLabel>
      <Select
        labelId={labelId}
        id="sort-select"
        label="Sort by"
        value={current}
        onChange={handleChange}
      >
        {OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}


