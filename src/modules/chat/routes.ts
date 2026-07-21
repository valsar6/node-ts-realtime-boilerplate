import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth';
import { chatController } from './controller';

const router = Router();

router.get('/rooms/:roomName/messages', requireAuth, chatController.getRoomHistory);

export const chatRoutes = router;
