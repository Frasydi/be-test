import { Router } from 'express';
import { AuthController } from '$controllers/rest/AuthController';

const router = Router();

// Authentication routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

export default router;
