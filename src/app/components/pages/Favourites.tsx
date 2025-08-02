import { Novel } from "@/app/types";
import { Alert, Grid, Typography } from "@mui/material";
import { NovelCard } from "../novels/NovelCard";

// FavoritesPage Component
interface FavoritesPageProps {
    novels: Novel[];
    favorites: Set<string>;
    onToggleFavorite: (id: string) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ novels, favorites, onToggleFavorite }) => {
    const favoriteNovels = novels.filter(novel => favorites.has(novel.id));
    return (
        <>
            <Typography variant="h4" component="h1" sx={{ my: 4 }}>Your Favorites</Typography>
            {favoriteNovels.length > 0 ? (
                <Grid container spacing={4}>
                    {favoriteNovels.map(novel => (
                        <Grid key={novel.id} size={{xs: 12, sm: 6, md: 4, lg: 3}}>
                            <NovelCard novel={novel} isFavorited={true} onToggleFavorite={onToggleFavorite} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Alert severity="info">You haven&apos;t favorited any novels yet. Click the heart icon on a novel to add it!</Alert>
            )}
        </>
    );
};