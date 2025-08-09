"use client";

import { Alert, Box, CircularProgress, Grid, Typography } from "@mui/material";
import { NovelCard } from "../components/NovelCard";
import { useNovels, useSearch } from "../providers";
import { SearchBar } from "../components";

export function BrowsePage() {
  const { novels, favoriteIds, toggleFavorite } = useNovels();
  const { filteredNovels } = useSearch();

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Discover Your Next Story
        </Typography>
        <SearchBar />
      </Box>
      {novels.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
          <CircularProgress />
        </Box>
      ) : filteredNovels.length > 0 ? (
        <Grid container spacing={4}>
          {filteredNovels.map((novel) => (
            <Grid key={novel.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <NovelCard
                novel={novel}
                isFavorited={favoriteIds.has(novel.id)}
                onToggleFavorite={toggleFavorite}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mt: 4 }}>
          No novels found. Try a different search.
        </Alert>
      )}
    </>
  );
}
