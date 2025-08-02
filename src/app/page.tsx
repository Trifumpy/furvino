'use client';

import React, { useState, useCallback, useMemo } from 'react';

// In a real Next.js app, these would be in separate files.
// For example: `types.ts`, `theme.ts`, `lib/firebase.ts`, `components/NovelCard.tsx`, etc.

import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';

import { useNovels } from './providers';
import { BrowsePage, FavoritesPage } from './components/pages';

// --- MAIN APP COMPONENT ---
export default function App() {
  const [page, setPage] = useState<'browse' | 'favorites' | 'admin'>('browse');
  const { novels } = useNovels();
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined); 
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const handleToggleFavorite = useCallback(async (novelId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(novelId)) {
        newFavorites.delete(novelId);
      } else {
        newFavorites.add(novelId);
      }
      return newFavorites;
    })
  }, []);

  const handleSearch = useCallback((searchTerm: string) => {
    setSearchTerm(searchTerm);
  }, []);

  const filteredNovels = useMemo(() => {
    if (!searchTerm) return novels;
    const lowercased = searchTerm.toLowerCase();
    const filtered = novels.filter(novel => 
        novel.title.toLowerCase().includes(lowercased) ||
        (novel.description && novel.description.toLowerCase().includes(lowercased)) ||
        novel.tags.some(tag => tag.toLowerCase().includes(lowercased))
    );
    return filtered;
  }, [novels, searchTerm]);

  const renderPage = () => {
    switch (page) {
      case 'favorites': return <FavoritesPage novels={novels} favorites={favorites} onToggleFavorite={handleToggleFavorite} />;
      default: return <BrowsePage novels={filteredNovels} favorites={favorites} onToggleFavorite={handleToggleFavorite} onSearch={handleSearch} isLoading={false} />;
    }
  };

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => setPage('browse')}>FurViNo</Typography>
          <Button color="inherit" onClick={() => setPage('browse')}>Browse</Button>
          <Button color="inherit" onClick={() => setPage('favorites')}>Favorites</Button>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ py: 4 }}>{renderPage()}</Container>
      <Box component="footer" sx={{ bgcolor: 'background.paper', p: 2, mt: 'auto' }}>
          <Typography variant="body2" color="text.secondary" align="center">&copy; {new Date().getFullYear()} FurViNo</Typography>
      </Box>
    </>
  );
}
