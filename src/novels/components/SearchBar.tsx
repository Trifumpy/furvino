"use client";

import { TextField } from "@mui/material";
import Link from "next/link";
import { useSearch } from "../providers";
import { useSearchParams } from "next/navigation";

export function SearchBar() {
  const { setSearchQuery } = useSearch();
  const sp = useSearchParams();
  const defaultValue = typeof sp?.get("q") === "string" ? (sp.get("q") as string) : "";

  return (
    <TextField
      fullWidth
      label="Search for a visual novel by title, author, or tag..."
      variant="outlined"
      defaultValue={defaultValue}
      helperText={
        <>
          Do you want to add your own? Check &quot;
          <Link href="/about">about</Link>
          &quot; for more information
        </>
      }
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setSearchQuery(e.target.value || undefined)
      }
    />
  );
}
