import { Router } from 'express';
import { NovelController } from '../controllers/novel.controller';

const router = Router();
const novelController = new NovelController();

export function setNovelRoutes(app: Router) {
    app.use('/api/novels', router);
    router.get('/', novelController.getNovels.bind(novelController));
}