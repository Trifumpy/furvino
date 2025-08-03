"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useNovel } from "../providers";
import Image from "next/image";
import { DEFAULT_NOVEL_COVER_URL } from "../components/constants";
import { Links } from "../components/Links";

export function NovelDetailsPage() {
  const { novel } = useNovel();

  if (!novel) {
    return;
  }

  const description = novel.description ?? novel.snippet;

  return (
    <>
      <Box pt={2}>
        <Image
          src={novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL}
          alt={`Cover for ${novel.title}`}
          height={300}
          width={600}
          style={{
            width: "100%",
            height: 300,
            objectFit: "cover",
          }}
        />
      </Box>
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="h4" component="h1" sx={{ my: 4 }}>
          {novel.title}
        </Typography>
        <Links novel={novel} />
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
    </>
  );
}
