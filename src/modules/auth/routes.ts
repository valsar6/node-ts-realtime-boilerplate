import { Router } from 'express';
import { authController } from './controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

export const authRoutes = router;
