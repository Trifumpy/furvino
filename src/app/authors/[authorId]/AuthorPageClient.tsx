"use client";

import { Box, Button, Grid, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useAuthor, useUser } from "@/users/providers";
import { useNovels } from "@/novels/providers/ClientNovelsProvider";
import { NovelCard } from "@/novels/components";
import { SortSelect } from "@/novels/components";
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { SERVICE_ICONS, SERVICE_NAMES } from "@/generic/data";
import { ExternalSite } from "@/contracts/novels";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authorKeys, useRegistry } from "@/utils/client";

export default function AuthorPageClient() {
  const { author } = useAuthor();
  const { user, isAdmin } = useUser();
  const { novels, favoriteIds, toggleFavorite } = useNovels();

  const links = author.externalUrls;
  const isOwner = Boolean(user?.authorId && user.authorId === author.id);
  const canEdit = Boolean(isAdmin || isOwner);
  const { authors: authorsSvc } = useRegistry();
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: authorKeys.author(author.id),
    queryFn: () => authorsSvc.getAuthorById(author.id),
  });
  const isFollowing = !!(data as unknown as { isFollowing?: boolean })?.isFollowing;
  const follow = useMutation({
    mutationFn: () => authorsSvc.follow(author.id),
    onSuccess: () => client.invalidateQueries({ queryKey: authorKeys.author(author.id) }),
  });
  const unfollow = useMutation({
    mutationFn: () => authorsSvc.unfollow(author.id),
    onSuccess: () => client.invalidateQueries({ queryKey: authorKeys.author(author.id) }),
  });

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {author.name}
          </Typography>
          {author.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {author.description}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" gap={2} alignItems="center">
          <SortSelect />
          <Button
            variant="contained"
            onClick={() => (isFollowing ? unfollow.mutate() : follow.mutate())}
            disabled={follow.isPending || unfollow.isPending}
          >
            {isFollowing ? "Unfollow author" : "Follow author"}
          </Button>
          {canEdit && (
            <IconButton
              LinkComponent={Link}
              href={`/authors/${author.id}/edit`}
              aria-label="Edit Author"
            >
              <PencilIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {links && Object.keys(links).length > 0 && (
        <Stack direction="row" gap={2} sx={{ mb: 2 }}>
          {Object.entries(links).map(([key, href]) => {
            const k = key as ExternalSite;
            if (!href) return null;
            const Icon = SERVICE_ICONS[k];
            return (
              <Tooltip key={k} title={SERVICE_NAMES[k]}>
                <IconButton LinkComponent={Link} href={href} target="_blank" rel="noopener noreferrer">
                  <Icon size={24} />
                </IconButton>
              </Tooltip>
            );
          })}
        </Stack>
      )}

      <Grid container spacing={4}>
        {novels.map((novel) => (
          <Grid key={novel.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <NovelCard
              novel={novel}
              isFavorited={favoriteIds.has(novel.id)}
              onToggleFavorite={toggleFavorite}
            />
          </Grid>
        ))}
      </Grid>
    </>
  );
}


