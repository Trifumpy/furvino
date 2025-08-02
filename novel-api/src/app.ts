import express from 'express';
import { setNovelRoutes } from './routes/novel.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

setNovelRoutes(app);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});