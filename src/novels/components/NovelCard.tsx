"use client";

import { Novel } from "@/novels/types";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { DEFAULT_NOVEL_COVER_URL, TAG_COLORS } from "./constants";
import { HeartIcon } from "lucide-react";

// NovelCard Component
interface NovelCardProps {
  novel: Novel;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}

export const NovelCard: React.FC<NovelCardProps> = ({
  novel,
  isFavorited,
  onToggleFavorite,
}) => {
  const theme = useTheme();
  const heartColor = isFavorited
    ? theme.palette.error.main
    : theme.palette.text.primary;
  const heartFill = isFavorited ? theme.palette.error.main : "none";

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        height="160"
        image={novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL}
        alt={`Cover for ${novel.title}`}
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
          e.currentTarget.src = `https://placehold.co/600x400/1e1e1e/ffffff?text=Image+Error`;
        }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="div">
          {novel.title}
        </Typography>
        {novel.description ? (
          <Typography variant="body2" color="text.secondary">
            {novel.description}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            No description available.
          </Typography>
        )}
      </CardContent>
      <CardActions
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {novel.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              color={TAG_COLORS[tag] || "default"}
            />
          ))}
        </Box>
        <IconButton
          onClick={() => onToggleFavorite(novel.id)}
          aria-label="add to favorites"
        >
          <HeartIcon size={24} color={heartColor} fill={heartFill} />
        </IconButton>
      </CardActions>
    </Card>
  );
};
