"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useNovel } from "../providers";
import { DEFAULT_NOVEL_COVER_URL } from "../components/constants";
import { Links } from "../components/Links";
import { NovelDownloads } from "../components";
import { NovelTags } from "../components/NovelTags";
import { SafeImage } from "@/generic/display";

export function NovelDetailsPage() {
  const { novel } = useNovel();

  if (!novel) {
    return;
  }

  const description = novel.description ?? novel.snippet;
  const thumbnailUrl = novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL;

  return (
    <>
      <Box pt={2}>
        <SafeImage
          src={thumbnailUrl}
          alt={`Cover for ${novel.title}`}
          height={300}
          width={600}
          priority
          style={{
            width: "100%",
            height: 300,
            objectFit: "cover",
          }}
        />
      </Box>
      <Stack sx={{ py: 4 }} gap={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap={4}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h4" component="h1">
            {novel.title}
          </Typography>
          <Links novel={novel} />
        </Stack>
        <NovelTags tags={novel.tags} chipSize="medium" />
      </Stack>
      {description ? (
        description.split("\n").map((paragraph) => (
          <Typography
            key={paragraph}
            variant="body1"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {paragraph}
          </Typography>
        ))
      ) : (
        <Typography variant="body1" color="text.secondary" fontStyle="italic">
          No description available.
        </Typography>
      )}
      <Stack direction="row" justifyContent="center" my={4}>
        <NovelDownloads novel={novel} />
      </Stack>
    </>
  );
}
