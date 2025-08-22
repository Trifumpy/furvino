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
import { Rating } from "@mui/material";
import { HeartIcon } from "lucide-react";
import Link from "next/link";
import { NovelTags } from "./NovelTags";
import { ListedNovel } from "@/contracts/novels";

// NovelCard Component
interface Props {
  novel: ListedNovel;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  disableLink?: boolean;
}

const SHOW_FAVORITE_BUTTON = false;

export function NovelCard({
  novel,
  isFavorited,
  onToggleFavorite,
  disableLink = false,
}: Props) {
  const theme = useTheme();
  const heartColor = isFavorited
    ? theme.palette.error.main
    : theme.palette.text.primary;
  const heartFill = isFavorited ? theme.palette.error.main : "none";

  const snippet = novel.snippet;

  const detailsUrl = `/novels/${novel.id}`;

  const MediaAndContent = (
    <>
      <CardMedia
        component="img"
        image={novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL}
        alt={`Cover for ${novel.title}`}
        sx={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }}
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
          e.currentTarget.src = `https://placehold.co/400x300/1e1e1e/ffffff?text=Image+Error`;
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
          <Stack direction="row" alignItems="center" gap={1}>
            {(() => {
              const avg = novel.ratingsSummary?.average ?? 0;
              const roundedTenth = Math.round(avg * 10) / 10;
              return (
                <Rating
                  size="small"
                  readOnly
                  value={roundedTenth}
                  precision={0.1}
                  max={5}
                />
              );
            })()}
          </Stack>
        </Stack>
        {snippet ? (
          <Typography variant="body2" color="text.secondary">
            {snippet}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            No description available.
          </Typography>
        )}
      </CardContent>
    </>
  );

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {disableLink ? (
        <div style={{ textDecoration: "none", color: "inherit", flexGrow: 1 }}>
          {MediaAndContent}
        </div>
      ) : (
        <Link
          href={detailsUrl}
          style={{ textDecoration: "none", color: "inherit", flexGrow: 1 }}
        >
          {MediaAndContent}
        </Link>
      )}
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
