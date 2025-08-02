import { Alert, Box, CircularProgress, Grid, TextField, Typography } from "@mui/material";
import { NovelCard } from "../novels/NovelCard";
import { Novel } from "@/app/types";

// BrowsePage Component
interface BrowsePageProps {
    novels: Novel[];
    favorites: Set<string>;
    onToggleFavorite: (id: string) => void;
    onSearch: (term: string) => void;
    isLoading: boolean;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({ novels, favorites, onToggleFavorite, onSearch, isLoading }) => (
    <>
        <Box sx={{ my: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>Discover Your Next Story</Typography>
            <TextField fullWidth label="Search for a visual novel, character, or tag..." variant="outlined" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)} />
        </Box>
        {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
        ) : novels.length > 0 ? (
            <Grid container spacing={4}>
                {novels.map(novel => (
                    <Grid key={novel.id} size={{xs: 12, sm:6, md:4, lg: 3}}>
                        <NovelCard novel={novel} isFavorited={favorites.has(novel.id)} onToggleFavorite={onToggleFavorite} />
                    </Grid>
                ))}
            </Grid>
        ) : (
            <Alert severity="info" sx={{ mt: 4 }}>No novels found. Try a different search or seed the database from the admin panel.</Alert>
        )}
    </>
);