"use client";

import { Alert, Grid, Typography } from "@mui/material";
import { NovelCard } from "../components/NovelCard";
import { useNovels } from "../providers/ClientNovelsProvider";

export function FavoritesPage() {
  const { favoriteNovels, toggleFavorite } = useNovels();

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ my: 4 }}>
        Your Favorites
      </Typography>
      <Alert severity="warning">
        This feature is still under development. Some functionality may not work
        as expected.
      </Alert>
      {favoriteNovels.length > 0 ? (
        <Grid container spacing={4}>
          {favoriteNovels.map((novel) => (
            <Grid key={novel.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <NovelCard
                novel={novel}
                isFavorited={true}
                onToggleFavorite={toggleFavorite}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">
          You haven&apos;t favorited any novels yet. Click the heart icon on a
          novel to add it!
        </Alert>
      )}
    </>
  );
}
