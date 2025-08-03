"use client";

import { TextField } from "@mui/material";
import { useSearch } from "../providers";

export function SearchBar() {
  const { setSearchQuery } = useSearch();

  return (
    <TextField
      fullWidth
      label="Search for a visual novel by title, author, or tag..."
      variant="outlined"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setSearchQuery(e.target.value || undefined)
      }
    />
  );
}
