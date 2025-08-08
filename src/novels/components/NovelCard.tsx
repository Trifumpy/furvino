"use client";

import {
  Card,
  CardActions,
  CardContent,
  CardMedia,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { DEFAULT_NOVEL_COVER_URL } from "./constants";
import { HeartIcon } from "lucide-react";
import { trimString } from "@/utils";
import Link from "next/link";
import { NovelTags } from "./NovelTags";
import { ListedNovel } from "@/contracts/novels";

// NovelCard Component
interface Props {
  novel: ListedNovel;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}

const AUTOMATIC_DESCRIPTION_SNIPPET_LENGTH = 200;
const SHOW_FAVORITE_BUTTON = false;

export function NovelCard({ novel, isFavorited, onToggleFavorite }: Props) {
  const theme = useTheme();
  const heartColor = isFavorited
    ? theme.palette.error.main
    : theme.palette.text.primary;
  const heartFill = isFavorited ? theme.palette.error.main : "none";

  const snippet =
    novel.snippet ??
    (novel.description
      ? trimString(novel.description, AUTOMATIC_DESCRIPTION_SNIPPET_LENGTH)
      : undefined);

  const detailsUrl = `/novels/${novel.id}`;

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Link
        href={detailsUrl}
        style={{ textDecoration: "none", color: "inherit", flexGrow: 1 }}
      >
        <CardMedia
          component="img"
          height="160"
          image={novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL}
          alt={`Cover for ${novel.title}`}
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src = `https://placehold.co/600x400/1e1e1e/ffffff?text=Image+Error`;
          }}
        />
        <CardContent>
          <Stack pb={2}>
            <Typography variant="h5" component="div">
              {novel.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" mt={1}>
              {novel.author.name}
            </Typography>
          </Stack>
          {snippet ? (
            <Typography variant="body2" color="text.secondary">
              {snippet}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              fontStyle="italic"
            >
              No description available.
            </Typography>
          )}
        </CardContent>
      </Link>
      <CardActions
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          p: 2,
        }}
      >
        <NovelTags tags={novel.tags} />
        {SHOW_FAVORITE_BUTTON && (
          <IconButton
            onClick={() => onToggleFavorite(novel.id)}
            aria-label="add to favorites"
          >
            <HeartIcon size={24} color={heartColor} fill={heartFill} />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
}
