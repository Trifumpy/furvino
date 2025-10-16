"use client";

import { Alert, Box, CircularProgress, Grid, Pagination, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { NovelCard } from "../components/NovelCard";
import { useNovels } from "../providers/ClientNovelsProvider";
import { useSearch } from "../providers/SearchProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar, SortSelect } from "../components";

export function BrowsePage() {
  const { novels, favoriteIds, toggleFavorite, pagination } = useNovels();
  const { filteredNovels } = useSearch();
  const router = useRouter();
  const sp = useSearchParams();

  const handlePageChange = (_: unknown, newPage: number) => {
    const params = new URLSearchParams(sp?.toString() || "");
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <SearchBar />
          </Box>
          <SortSelect />
          {/* Mobile-only helper text under sort menu */}
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "block", sm: "none" } }}>
            Do you want to add your own? Check &quot;<Link href="/about">about</Link>&quot; for more information
          </Typography>
        </Stack>
      </Box>
      {novels.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
          <CircularProgress />
        </Box>
      ) : filteredNovels.length > 0 ? (
        <>
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
          <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Stack>
        </>
      ) : (
        <Alert severity="info" sx={{ mt: 4 }}>
          No novels found. Try a different search.
        </Alert>
      )}
    </>
  );
}
