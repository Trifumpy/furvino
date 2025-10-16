"use client";

import { useNovel } from "../providers/ClientNovelProvider";
import { useUser } from "@/users/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { Rating, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const CATEGORIES = [
  { key: "plot", label: "Plot" },
  { key: "characters", label: "Characters" },
  { key: "backgroundsUi", label: "Backgrounds & UI" },
  { key: "characterArt", label: "Character Art" },
  { key: "music", label: "Music" },
  { key: "soundEffects", label: "Sound Effects / Voice Acting" },
  { key: "emotionalImpact", label: "Personal Emotional Impact" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];
const LABEL_MIN_WIDTH = 260;

export function NovelRatings({ buttonBgColor, buttonTextColor }: { buttonBgColor?: string; buttonTextColor?: string }) {
  const { novel } = useNovel();
  const { user } = useUser();
  const { novels } = useRegistry();
  const client = useQueryClient();

  const summary = useQuery({
    queryKey: ["novelRating", novel?.id],
    queryFn: () => novels.getRatingSummary(novel!.id),
    enabled: !!novel,
  });

  // Rating form moved to NovelRatingsList; keep summary-only here
  if (!novel) return null;

  return (
    <Stack gap={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
      >
        <Typography variant="h6">Ratings</Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Typography variant="caption">
            Avg: {(summary.data?.average ?? 0).toFixed(2)} (
            {summary.data?.total ?? 0})
          </Typography>
          {(() => {
            const avg = summary.data?.average ?? 0;
            const roundedTenth = Math.round(avg * 10) / 10;
            return (
              <Rating
                size="small"
                readOnly
                value={roundedTenth}
                precision={0.1}
                max={5}
                sx={{
                }}
              />
            );
          })()}
        </Stack>
      </Stack>

      {!user && (
        <Typography variant="body2" color="text.secondary">
          Log in to rate this novel.
        </Typography>
      )}

      {/* Rating modal removed from summary; moved to NovelRatingsList */}
    </Stack>
  );
}
