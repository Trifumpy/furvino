import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, Auth, User } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, updateDoc, Firestore } from 'firebase/firestore';

// In a real Next.js app, these would be in separate files.
// For example: `types.ts`, `theme.ts`, `lib/firebase.ts`, `components/VnCard.tsx`, etc.

import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Grid,
  TextField,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Modal,
  CircularProgress,
  Alert
} from '@mui/material';
import { Favorite, FavoriteBorder, Settings, Edit, Delete } from '@mui/icons-material';

// --- TYPES ---
interface VisualNovel {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
}

type AddNovelData = Omit<VisualNovel, 'id'>;

// --- THEME ---
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
  typography: { fontFamily: 'Inter, sans-serif' },
});

// --- FIREBASE CONFIG ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId: string = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const app: FirebaseApp = initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

const VNS_COLLECTION = `artifacts/${appId}/public/data/visual_novels`;
const USERS_COLLECTION = `artifacts/${appId}/users`;

// --- COMPONENTS ---

// VnCard Component
interface VnCardProps {
  vn: VisualNovel;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}

const VnCard: React.FC<VnCardProps> = ({ vn, isFavorited, onToggleFavorite }) => {
  const tagColors: { [key: string]: 'secondary' | 'info' | 'error' | 'primary' | 'warning' | 'success' | 'default' } = {
      'Horror': 'secondary', 'Mystery': 'info', 'Supernatural': 'error',
      'Sci-Fi': 'primary', 'Romance': 'warning', 'Politics': 'secondary',
      'Historical': 'default', 'Slice of Life': 'success', 'College': 'primary',
      'Fantasy': 'secondary', 'Adventure': 'success', 'Coming of Age': 'warning',
      'Drama': 'error', 'Medieval': 'default'
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="160"
        image={vn.image}
        alt={`Cover for ${vn.title}`}
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.src = `https://placehold.co/600x400/1e1e1e/ffffff?text=Image+Error`; }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="div">{vn.title}</Typography>
        <Typography variant="body2" color="text.secondary">{vn.description}</Typography>
      </CardContent>
      <CardActions sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', p: 2 }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {vn.tags.map(tag => <Chip key={tag} label={tag} size="small" color={tagColors[tag] || 'default'} />)}
        </Box>
        <IconButton onClick={() => onToggleFavorite(vn.id)} aria-label="add to favorites">
          {isFavorited ? <Favorite color="error" /> : <FavoriteBorder />}
        </IconButton>
      </CardActions>
    </Card>
  );
};

// EditModal Component
interface EditModalProps {
    open: boolean;
    onClose: () => void;
    vn: VisualNovel | null;
    onSave: (vn: VisualNovel) => void;
}

const EditModal: React.FC<EditModalProps> = ({ open, onClose, vn, onSave }) => {
    const [formData, setFormData] = useState<VisualNovel | null>(vn);

    useEffect(() => { setFormData(vn); }, [vn]);

    if (!vn) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            const tagsArray = typeof formData.tags === 'string' 
                ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
                : formData.tags;
            onSave({ ...formData, tags: tagsArray });
        }
    };

    return (        
        <Modal open={open} onClose={onClose}>
            <Box component="form" onSubmit={handleSave} sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
                <Typography variant="h6" component="h2" mb={2}>Edit Novel</Typography>
                <TextField name="title" label="Title" value={formData?.title || ''} onChange={handleChange} fullWidth margin="normal" required />
                <TextField name="description" label="Description" value={formData?.description || ''} onChange={handleChange} fullWidth margin="normal" multiline rows={3} required />
                <TextField name="tags" label="Tags (comma-separated)" value={Array.isArray(formData?.tags) ? formData.tags.join(', ') : ''} onChange={handleChange} fullWidth margin="normal" required />
                <TextField name="image" label="Image URL" value={formData?.image || ''} onChange={handleChange} fullWidth margin="normal" type="url" required />
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained">Save</Button>
                </Box>
            </Box>
        </Modal>
    );
};

// --- PAGES ---

// BrowsePage Component
interface BrowsePageProps {
    novels: VisualNovel[];
    favorites: Set<string>;
    onToggleFavorite: (id: string) => void;
    onSearch: (term: string) => void;
    isLoading: boolean;
}

const BrowsePage: React.FC<BrowsePageProps> = ({ novels, favorites, onToggleFavorite, onSearch, isLoading }) => (
    <>
        <Box sx={{ my: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>Discover Your Next Story</Typography>
            <TextField fullWidth label="Search for a visual novel, character, or tag..." variant="outlined" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)} />
        </Box>
        {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
        ) : novels.length > 0 ? (
            <Grid container spacing={4}>
                {novels.map(vn => (
                    <Grid item key={vn.id} xs={12} sm={6} md={4} lg={3}>
                        <VnCard vn={vn} isFavorited={favorites.has(vn.id)} onToggleFavorite={onToggleFavorite} />
                    </Grid>
                ))}
            </Grid>
        ) : (
            <Alert severity="info" sx={{ mt: 4 }}>No novels found. Try a different search or seed the database from the admin panel.</Alert>
        )}
    </>
);

// FavoritesPage Component
interface FavoritesPageProps {
    novels: VisualNovel[];
    favorites: Set<string>;
    onToggleFavorite: (id: string) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ novels, favorites, onToggleFavorite }) => {
    const favoriteNovels = novels.filter(vn => favorites.has(vn.id));
    return (
        <>
            <Typography variant="h4" component="h1" sx={{ my: 4 }}>Your Favorites</Typography>
            {favoriteNovels.length > 0 ? (
                <Grid container spacing={4}>
                    {favoriteNovels.map(vn => (
                        <Grid item key={vn.id} xs={12} sm={6} md={4} lg={3}>
                            <VnCard vn={vn} isFavorited={true} onToggleFavorite={onToggleFavorite} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Alert severity="info">You haven't favorited any novels yet. Click the heart icon on a novel to add it!</Alert>
            )}
        </>
    );
};

// AdminPage Component
interface AdminPageProps {
    novels: VisualNovel[];
    onAdd: (data: AddNovelData) => Promise<void>;
    onEdit: (data: VisualNovel) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onSeed: () => Promise<void>;
}

const AdminPage: React.FC<AdminPageProps> = ({ novels, onAdd, onEdit, onDelete, onSeed }) => {
    const [addForm, setAddForm] = useState({ title: '', description: '', tags: '', image: '' });
    const [status, setStatus] = useState({ msg: '', type: 'info' as 'info' | 'success' | 'error' });
    const [vnToEdit, setVnToEdit] = useState<VisualNovel | null>(null);
    const [vnToDelete, setVnToDelete] = useState<VisualNovel | null>(null);

    const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await onAdd({
                ...addForm,
                tags: addForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            setStatus({ msg: 'Novel added successfully!', type: 'success' });
            setAddForm({ title: '', description: '', tags: '', image: '' });
        } catch (error) {
            setStatus({ msg: `Error: ${(error as Error).message}`, type: 'error' });
        }
    };
    
    const handleSaveChanges = async (editedVn: VisualNovel) => {
        await onEdit(editedVn);
        setVnToEdit(null);
    };

    const handleDeleteConfirm = async () => {
        if (vnToDelete) {
            await onDelete(vnToDelete.id);
            setVnToDelete(null);
        }
    };

    return (
        <>
            <Typography variant="h4" component="h1" sx={{ my: 4 }}>Admin Panel</Typography>
            <Box component="form" onSubmit={handleAddSubmit} sx={{ p: 2, border: '1px solid grey', borderRadius: 1, mb: 4 }}>
                <Typography variant="h6">Add New Novel</Typography>
                <TextField name="title" label="Title" value={addForm.title} onChange={handleAddChange} fullWidth margin="normal" required />
                <TextField name="description" label="Description" value={addForm.description} onChange={handleAddChange} fullWidth margin="normal" multiline rows={3} required />
                <TextField name="tags" label="Tags (comma-separated)" value={addForm.tags} onChange={handleAddChange} fullWidth margin="normal" required />
                <TextField name="image" label="Image URL" value={addForm.image} onChange={handleAddChange} fullWidth margin="normal" type="url" required />
                <Button type="submit" variant="contained" sx={{ mt: 1 }}>Add Novel</Button>
                {status.msg && <Alert severity={status.type} sx={{ mt: 2 }}>{status.msg}</Alert>}
            </Box>
            <Box sx={{ p: 2, border: '1px solid grey', borderRadius: 1, mb: 4 }}>
                <Typography variant="h6" mb={2}>Manage Existing Novels</Typography>
                {novels.map(vn => (
                    <Box key={vn.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid #333' }}>
                        <Typography>{vn.title}</Typography>
                        <Box>
                            <IconButton onClick={() => setVnToEdit(vn)}><Edit /></IconButton>
                            <IconButton onClick={() => setVnToDelete(vn)}><Delete /></IconButton>
                        </Box>
                    </Box>
                ))}
            </Box>
            <Box sx={{ p: 2, border: '1px solid grey', borderRadius: 1 }}>
                <Typography variant="h6">Database Tools</Typography>
                <Button variant="contained" color="success" onClick={onSeed}>Seed Database</Button>
            </Box>
            <EditModal open={!!vnToEdit} onClose={() => setVnToEdit(null)} vn={vnToEdit} onSave={handleSaveChanges} />
            <Modal open={!!vnToDelete} onClose={() => setVnToDelete(null)}>
                 <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', p: 4 }}>
                    <Typography variant="h6">Are you sure?</Typography>
                    <Typography sx={{ mt: 2 }}>This will permanently delete "{vnToDelete?.title}".</Typography>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button onClick={() => setVnToDelete(null)}>Cancel</Button>
                        <Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button>
                    </Box>
                 </Box>
            </Modal>
        </>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [page, setPage] = useState<'browse' | 'favorites' | 'admin'>('browse');
  const [user, setUser] = useState<User | null>(null);
  const [allNovels, setAllNovels] = useState<VisualNovel[]>([]);
  const [filteredNovels, setFilteredNovels] = useState<VisualNovel[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
            const token = (window as any).__initial_auth_token;
            if (token) {
                await signInWithCustomToken(auth, token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) { console.error("Sign-in failed", error); }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubNovels = onSnapshot(collection(db, VNS_COLLECTION), (snapshot) => {
      const novelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisualNovel));
      setAllNovels(novelsData);
      setFilteredNovels(novelsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching novels:", error);
      setIsLoading(false);
    });
    const unsubFavorites = onSnapshot(collection(db, `${USERS_COLLECTION}/${user.uid}/favorites`), (snapshot) => {
      setFavorites(new Set(snapshot.docs.map(doc => doc.id)));
    });
    return () => { unsubNovels(); unsubFavorites(); };
  }, [user]);

  const handleToggleFavorite = useCallback(async (novelId: string) => {
    if (!user) return;
    const favDocRef = doc(db, `${USERS_COLLECTION}/${user.uid}/favorites/${novelId}`);
    if (favorites.has(novelId)) {
      await deleteDoc(favDocRef);
    } else {
      await setDoc(favDocRef, { favoritedAt: new Date() });
    }
  }, [user, favorites]);

  const handleSearch = useCallback((searchTerm: string) => {
    const lowercased = searchTerm.toLowerCase();
    const filtered = allNovels.filter(vn => 
        vn.title.toLowerCase().includes(lowercased) ||
        vn.description.toLowerCase().includes(lowercased) ||
        vn.tags.some(tag => tag.toLowerCase().includes(lowercased))
    );
    setFilteredNovels(filtered);
  }, [allNovels]);
  
  const handleAddNovel = async (novelData: AddNovelData) => {
    const novelId = novelData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await setDoc(doc(db, VNS_COLLECTION, novelId), novelData);
  };
  
  const handleEditNovel = async (novelData: VisualNovel) => {
    await updateDoc(doc(db, VNS_COLLECTION, novelData.id), novelData);
  };

  const handleDeleteNovel = async (novelId: string) => {
    await deleteDoc(doc(db, VNS_COLLECTION, novelId));
  };
  
  const handleSeedDatabase = async () => {
    const initialNovels: AddNovelData[] = [
        { title: 'Echo', description: 'A psychological horror story...', tags: ['Horror', 'Mystery', 'Supernatural'], image: 'https://placehold.co/600x400/1e1e1e/ffffff?text=Echo' },
        { title: 'Adastra', description: 'A human is abducted...', tags: ['Sci-Fi', 'Romance', 'Politics'], image: 'https://placehold.co/600x400/1e1e1e/ffffff?text=Adastra' },
    ];
    const batch = writeBatch(db);
    initialNovels.forEach(vn => {
        const id = vn.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        batch.set(doc(db, VNS_COLLECTION, id), vn);
    });
    await batch.commit();
    alert('Database seeded!');
  };

  const renderPage = () => {
    switch (page) {
      case 'favorites': return <FavoritesPage novels={allNovels} favorites={favorites} onToggleFavorite={handleToggleFavorite} />;
      case 'admin': return <AdminPage novels={allNovels} onAdd={handleAddNovel} onEdit={handleEditNovel} onDelete={handleDeleteNovel} onSeed={handleSeedDatabase} />;
      default: return <BrowsePage novels={filteredNovels} favorites={favorites} onToggleFavorite={handleToggleFavorite} onSearch={handleSearch} isLoading={isLoading} />;
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => setPage('browse')}>FurViNo</Typography>
          <Button color="inherit" onClick={() => setPage('browse')}>Browse</Button>
          <Button color="inherit" onClick={() => setPage('favorites')}>Favorites</Button>
          {user && <IconButton color="inherit" onClick={() => setPage('admin')}><Settings /></IconButton>}
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ py: 4 }}>{renderPage()}</Container>
      <Box component="footer" sx={{ bgcolor: 'background.paper', p: 2, mt: 'auto' }}>
          <Typography variant="body2" color="text.secondary" align="center">&copy; {new Date().getFullYear()} FurViNo</Typography>
      </Box>
    </ThemeProvider>
  );
}
