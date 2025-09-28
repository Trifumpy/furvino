"use client";

import { useNovel } from "../providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { Box, Button, Rating, Stack, Typography } from "@mui/material";
import { SafeImage } from "@/generic/display";
import { ListedUserRating } from "@/contracts/novels";
import { useState } from "react";
import { Modal, ModalActions, ModalContent, ModalTitle } from "@/generic/input/Modal";
import { useUser } from "@/users/providers";

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

export function NovelRatingsList() {
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
  const [isOpen, setIsOpen] = useState(false);
  const fullQuery = useQuery({
    queryKey: ["novelRatingAll", novelId],
    queryFn: () => novels.getRatingSummary(novelId as string, { limit: 1000 }),
    enabled: !!novelId && isOpen,
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

  return (
    <Stack gap={1}>
      <Typography variant="subtitle1">Ratings summary</Typography>
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
              <Typography variant="caption">{new Date(r.updatedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</Typography>
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
                    <Button size="small" color="error" disabled={removeReason.isPending} onClick={() => removeReason.mutate(r.id)}>
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
          <Button variant="text" size="small" onClick={() => setIsOpen(true)}>View more ratings</Button>
        </Stack>
      )}

      <Modal isOpen={isOpen} close={() => setIsOpen(false)} maxWidth="md" fullWidth>
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
                    <Typography variant="caption">{new Date(r.updatedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</Typography>
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
                          <Button size="small" color="error" disabled={removeReason.isPending} onClick={() => removeReason.mutate(r.id)}>
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
        <ModalActions close={() => setIsOpen(false)} />
      </Modal>
    </Stack>
  );
}


