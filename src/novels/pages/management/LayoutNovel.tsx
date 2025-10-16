"use client";

import { Stack, Typography, Button } from "@mui/material";
import { useNovel } from "@/novels/providers/ClientNovelProvider";
import { PageLayoutEditor } from "./components";
import Link from "next/link";

export function NovelLayoutPage() {
  const { novel } = useNovel();
  if (!novel) return null;
  return (
    <Stack gap={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Layout: {novel.title}</Typography>
        <Button component={Link} href={`/novels/${novel.id}/edit`} variant="text">Back to edit</Button>
      </Stack>
      <PageLayoutEditor />
    </Stack>
  );
}

