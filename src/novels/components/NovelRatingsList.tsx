"use client";

import { useNovel } from "../providers/ClientNovelProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { Box, Button, Rating, Stack, Typography, TextField } from "@mui/material";
import { formatDateTimeUtcShort } from "@/utils/lib/dates";
import { SafeImage } from "@/generic/display";
import { ListedUserRating } from "@/contracts/novels";
import { useState } from "react";
import { Modal, ModalActions, ModalContent, ModalTitle } from "@/generic/input/Modal";
import { useUser } from "@/users/providers";
import { UserStar as UserStarIcon } from "lucide-react";

const CATEGORY_META: ReadonlyArray<{
  key: keyof Pick<
    ListedUserRating,
    | "plot"
    | "characters"
    | "backgroundsUi"
    | "characterArt"
    | "music"
    | "soundEffects"
    | "emotionalImpact"
  >;
  label: string;
}> = [
  { key: "plot", label: "Plot" },
  { key: "characters", label: "Characters" },
  { key: "backgroundsUi", label: "Backgrounds & UI" },
  { key: "characterArt", label: "Character Art" },
  { key: "music", label: "Music" },
  { key: "soundEffects", label: "Sound Effects / Voice Acting" },
  { key: "emotionalImpact", label: "Personal Emotional Impact" },
] as const;

type CategoryKey = (typeof CATEGORY_META)[number]["key"];

export function NovelRatingsList({ buttonBgColor, buttonTextColor }: { buttonBgColor?: string; buttonTextColor?: string }) {
  const { novel } = useNovel();
  const { novels } = useRegistry();
  const { user, isAdmin } = useUser();
  const client = useQueryClient();
  const novelId = novel?.id;
  const query = useQuery({
    queryKey: ["novelRating", novelId],
    queryFn: () => novels.getRatingSummary(novelId as string, { limit: 5 }),
    enabled: !!novelId,
  });
  const recent = (query.data?.recent ?? []) as ListedUserRating[];
  const total = query.data?.total ?? recent.length;

  const LABEL_MIN_WIDTH = 240;
  const [isAllOpen, setIsAllOpen] = useState(false);
  const fullQuery = useQuery({
    queryKey: ["novelRatingAll", novelId],
    queryFn: () => novels.getRatingSummary(novelId as string, { limit: 1000 }),
    enabled: !!novelId && isAllOpen,
  });

  const removeReason = useMutation({
    mutationFn: async (ratingId: string) => {
      if (!novelId) return;
      await novels.deleteRatingReason(novelId, ratingId);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["novelRating", novelId] });
      client.invalidateQueries({ queryKey: ["novelRatingAll", novelId] });
    },
  });

  // Rate/Edit rating modal state
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<CategoryKey, number>>>({});
  const [reason, setReason] = useState("");
  const upsert = useMutation({
    mutationFn: async () => {
      if (!novelId) return;
      const categories = Object.fromEntries(
        CATEGORY_META
          .map((c) => [c.key, Number(draft[c.key] || 0)])
          .filter(([, v]) => typeof v === "number" && v > 0)
      ) as Partial<Record<CategoryKey, number>>;
      await novels.upsertRating(novelId, { categories, reason: reason.trim() || undefined });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["novelRating", novelId] });
      client.invalidateQueries({ queryKey: ["novelRatingAll", novelId] });
      setIsRateOpen(false);
    },
  });

  const removeMine = useMutation({
    mutationFn: async () => {
      if (!novelId) return;
      await novels.deleteRating(novelId);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["novelRating", novelId] });
      client.invalidateQueries({ queryKey: ["novelRatingAll", novelId] });
      setIsRateOpen(false);
    },
  });

  function openRateModal() {
    if (!user) return;
    const mine = (query.data?.mine ?? {}) as Partial<Record<CategoryKey, number>> & { reason?: string };
    const next: Partial<Record<CategoryKey, number>> = {};
    CATEGORY_META.forEach((c) => {
      const v = mine[c.key];
      next[c.key] = typeof v === "number" && v > 0 ? v : 0;
    });
    setDraft(next);
    setReason(typeof mine.reason === "string" ? mine.reason : "");
    setIsRateOpen(true);
  }

  return (
    <Stack gap={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" alignItems="center" gap={1}>
          <UserStarIcon size={20} />
          <Typography variant="h6">Ratings</Typography>
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <Typography variant="caption">Avg: {(query.data?.average ?? 0).toFixed(2)} ({query.data?.total ?? 0})</Typography>
          <Rating size="small" readOnly value={Math.round((query.data?.average ?? 0) * 10) / 10} precision={0.1} max={5} />
          {user && (
            <Button
              variant="contained"
              size="small"
              onClick={openRateModal}
              sx={buttonBgColor || buttonTextColor ? { bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } } : undefined}
            >
              {query.data?.mine ? "Edit rating" : "Rate this novel"}
            </Button>
          )}
        </Stack>
      </Stack>
      <Typography variant="subtitle1">Category averages</Typography>
      {('categories' in (query.data ?? {})) && query.data?.categories && (
        <Stack gap={0.25}>
          {/* Overall row removed from summary; average still shown elsewhere */}
          {CATEGORY_META.map((c) => (
            <Stack
              key={`avg-${c.key}`}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              gap={{ xs: 0, sm: 1 }}
            >
              <Typography variant="body2" sx={{ width: { xs: "auto", sm: LABEL_MIN_WIDTH }, flexShrink: 0 }}>
                {c.label}
              </Typography>
              <Rating
                value={query.data!.categories![c.key]}
                readOnly
                max={5}
                size="small"
                precision={0.1}
                sx={{
                  mt: { xs: 0, sm: 0 },
                }}
              />
            </Stack>
          ))}
        </Stack>
      )}
      <Typography variant="subtitle1" sx={{ mt: 1 }}>Recent ratings</Typography>
      {recent.length === 0 && (
        <Typography variant="body2" color="text.secondary">No ratings yet.</Typography>
      )}
      {recent.map((r) => (
        <Stack key={r.id} direction="row" gap={2} alignItems="flex-start" sx={{ py: 1 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden" }}>
            <SafeImage
              src={r.user.avatarUrl || "https://placehold.co/64x64?text=?"}
              alt={`${r.user.username}'s avatar`}
              width={32}
              height={32}
              sizes="32px"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Stack sx={{ flex: 1 }} gap={0.5}>
            <Stack direction="row" gap={1} alignItems="center">
              <Typography variant="subtitle2">{r.user.username}</Typography>
              <Typography variant="caption">{formatDateTimeUtcShort(r.updatedAt)}</Typography>
            </Stack>
            {/* Per-user overall value removed from display */}
            <Stack gap={0.25}>
              {CATEGORY_META.map((c) => (
                <Stack
                  key={c.key}
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  gap={{ xs: 0, sm: 1 }}
                >
                  <Typography variant="body2" sx={{ width: { xs: "auto", sm: LABEL_MIN_WIDTH }, flexShrink: 0 }}>
                    {c.label}
                  </Typography>
                  <Rating
                    value={r[c.key]}
                    readOnly
                    max={5}
                    size="small"
                    precision={0.1}
                  sx={{
                    mt: { xs: 0, sm: 0 },
                  }}
                  />
                </Stack>
              ))}
            </Stack>
            {r.reason && (
              <Stack gap={0.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{r.reason}</Typography>
                {novel?.author && (isAdmin || user?.authorId === novel.author.id) && (
                  <Stack direction="row" justifyContent="flex-end">
                    <Button size="small" color="error" disabled={removeReason.isPending} onClick={() => {
                      if (window.confirm('Remove this rating comment? This cannot be undone.')) {
                        removeReason.mutate(r.id);
                      }
                    }}>
                      Remove comment
                    </Button>
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
      ))}
      {total > recent.length && (
        <Stack alignItems="center" mt={1}>
          <Button variant="text" size="small" onClick={() => setIsAllOpen(true)}>View more ratings</Button>
        </Stack>
      )}

      <Modal isOpen={isAllOpen} close={() => setIsAllOpen(false)} maxWidth="md" fullWidth>
        <ModalTitle>All ratings</ModalTitle>
        <ModalContent>
          <Stack gap={2}>
            {((fullQuery.data?.recent ?? []) as ListedUserRating[]).map((r) => (
              <Stack key={`all-${r.id}`} direction="row" gap={2} alignItems="flex-start" sx={{ py: 1 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden" }}>
                  <SafeImage
                    src={r.user.avatarUrl || "https://placehold.co/64x64?text=?"}
                    alt={`${r.user.username}'s avatar`}
                    width={32}
                    height={32}
                    sizes="32px"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <Stack sx={{ flex: 1 }} gap={0.5}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="subtitle2">{r.user.username}</Typography>
                    <Typography variant="caption">{formatDateTimeUtcShort(r.updatedAt)}</Typography>
                  </Stack>
                  {/* Per-user overall value removed in modal */}
                  <Stack gap={0.25}>
                    {CATEGORY_META.map((c) => (
                      <Stack
                        key={`all-${r.id}-${c.key}`}
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        gap={{ xs: 0, sm: 1 }}
                      >
                        <Typography variant="body2" sx={{ width: { xs: "auto", sm: LABEL_MIN_WIDTH }, flexShrink: 0 }}>
                          {c.label}
                        </Typography>
                        <Rating
                          value={r[c.key]}
                          readOnly
                          max={5}
                          size="small"
                          precision={0.1}
                          sx={{
                            mt: { xs: 0, sm: 0 },
                          }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                  {r.reason && (
                    <Stack gap={0.5} sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{r.reason}</Typography>
                      {novel?.author && (isAdmin || user?.authorId === novel.author.id) && (
                        <Stack direction="row" justifyContent="flex-end">
                          <Button size="small" color="error" disabled={removeReason.isPending} onClick={() => {
                            if (window.confirm('Remove this rating comment? This cannot be undone.')) {
                              removeReason.mutate(r.id);
                            }
                          }}>
                            Remove comment
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </ModalContent>
        <ModalActions close={() => setIsAllOpen(false)} />
      </Modal>

      {/* Rate/Edit rating modal */}
      <Modal
        isOpen={isRateOpen}
        close={() => setIsRateOpen(false)}
        maxWidth="sm"
        fullWidth
        onSubmit={(e) => {
          e.preventDefault();
          if (!upsert.isPending) upsert.mutate();
        }}
      >
        <ModalTitle>{query.data?.mine ? "Edit your rating" : "Rate this novel"}</ModalTitle>
        <ModalContent>
          <Stack gap={1.5}>
            {CATEGORY_META.map((c) => (
              <Stack
                key={`form-${c.key}`}
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                gap={{ xs: 0.5, sm: 1 }}
              >
                <Typography variant="body2" sx={{ width: { xs: "auto", sm: LABEL_MIN_WIDTH }, flexShrink: 0 }}>
                  {c.label}
                </Typography>
                <Rating
                  value={Number(draft[c.key] || 0)}
                  onChange={(_e, v) => setDraft((prev) => ({ ...prev, [c.key]: v || 0 }))}
                  max={5}
                  precision={1}
                  size="small"
                />
              </Stack>
            ))}
            <TextField
              label="Reason (optional)"
              placeholder="What stood out to you?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={3}
            />
          </Stack>
        </ModalContent>
        <ModalActions
          close={() => setIsRateOpen(false)}
          submitAction={"Save rating"}
          loading={upsert.isPending || removeMine.isPending}
          submitColor="primary"
          placeCancelAfterSubmit
        >
          {query.data?.mine && (
            <Button
              color="error"
              disabled={removeMine.isPending}
              onClick={() => {
                if (window.confirm('Delete your rating? This cannot be undone.')) {
                  removeMine.mutate();
                }
              }}
            >
              Delete rating
            </Button>
          )}
        </ModalActions>
      </Modal>
    </Stack>
  );
}


