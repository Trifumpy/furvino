"use client";

import { useNovel } from "../providers";
import { useUser } from "@/users/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { Button, Rating, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
} from "@/generic/input/Modal";
import { toast } from "react-toastify";
import { ListedUserRating } from "@/contracts/novels";

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

export function NovelRatings() {
  const { novel } = useNovel();
  const { user } = useUser();
  const { novels } = useRegistry();
  const client = useQueryClient();

  const summary = useQuery({
    queryKey: ["novelRating", novel?.id],
    queryFn: () => novels.getRatingSummary(novel!.id),
    enabled: !!novel,
  });

  const [categories, setCategories] = useState<
    Record<CategoryKey, number | null>
  >({
    plot: null,
    characters: null,
    backgroundsUi: null,
    characterArt: null,
    music: null,
    soundEffects: null,
    emotionalImpact: null,
  });
  const [reason, setReason] = useState("");
  // Prefill form if user has an existing rating
  const mine = summary.data?.mine as ListedUserRating | undefined;
  useEffect(() => {
    if (!mine) return;
    setCategories({
      plot: mine.plot > 0 ? mine.plot : null,
      characters: mine.characters > 0 ? mine.characters : null,
      backgroundsUi: mine.backgroundsUi > 0 ? mine.backgroundsUi : null,
      characterArt: mine.characterArt > 0 ? mine.characterArt : null,
      music: mine.music > 0 ? mine.music : null,
      soundEffects: mine.soundEffects > 0 ? mine.soundEffects : null,
      emotionalImpact: mine.emotionalImpact > 0 ? mine.emotionalImpact : null,
    });
    setReason(mine.reason || "");
  }, [mine]);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!novel) return;
      await novels.upsertRating(novel.id, {
        categories: Object.fromEntries(
          Object.entries(categories).filter(
            ([, v]) => typeof v === "number" && (v as number) > 0
          )
        ) as Record<CategoryKey, number>,
        reason: reason || undefined,
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["novelRating", novel?.id] });
      toast.success("Rating saved");
      setIsOpen(false);
    },
    onError: (e) => {
      toast.error((e as Error)?.message || "Failed to save rating");
    },
  });

  const onDelete = useMutation({
    mutationFn: async () => {
      if (!novel) return;
      await novels.deleteRating(novel.id);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["novelRating", novel?.id] });
      toast.success("Rating deleted");
      setIsOpen(false);
    },
    onError: (e) => {
      toast.error((e as Error)?.message || "Failed to delete rating");
    },
  });

  const [isOpen, setIsOpen] = useState(false);
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
          <Typography variant="caption" color="text.secondary">
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
              />
            );
          })()}
          {user && (
            <Button
              variant="contained"
              size="small"
              onClick={() => setIsOpen(true)}
            >
              {summary.data?.mine ? "Edit rating" : "Rate this novel"}
            </Button>
          )}
        </Stack>
      </Stack>

      {!user && (
        <Typography variant="body2" color="text.secondary">
          Log in to rate this novel.
        </Typography>
      )}

      <Modal
        isOpen={isOpen}
        close={() => setIsOpen(false)}
        onSubmit={() => upsert.mutate()}
        maxWidth="sm"
        fullWidth
      >
        <ModalTitle>Rate this novel</ModalTitle>
        <ModalContent>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            leave 0 stars if you have no opinion or doesn&apos;t apply to this
            novel (doesn&apos;t count towards the rating)
          </Typography>
          <Stack gap={1.5}>
            {/* Overall category removed */}
            {CATEGORIES.map((c) => (
              <Stack
                key={c.key}
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                gap={{ xs: 0, sm: 1 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    width: { xs: "auto", sm: LABEL_MIN_WIDTH },
                    flexShrink: 0,
                  }}
                >
                  {c.label}
                </Typography>
                <Rating
                  size="small"
                  value={categories[c.key]}
                  onChange={(_, v) =>
                    setCategories((prev) => ({ ...prev, [c.key]: v }))
                  }
                  max={5}
                  sx={{ mt: { xs: 0, sm: 0 } }}
                />
              </Stack>
            ))}
            <TextField
              label="Tell us why (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 2000))}
              multiline
              minRows={3}
              helperText={`${reason.length}/2000`}
            />
          </Stack>
        </ModalContent>
        <ModalActions
          close={() => setIsOpen(false)}
          submitAction="Save rating"
          loading={upsert.isPending}
          disabled={false}
          submitColor="primary"
          placeCancelAfterSubmit
        >
          <Button
            color="error"
            variant="outlined"
            disabled={onDelete.isPending}
            onClick={() => onDelete.mutate()}
          >
            Delete my rating
          </Button>
        </ModalActions>
      </Modal>
    </Stack>
  );
}
