import { Router } from 'express';
import { DataController } from '$controllers/rest/DataController';
import { authenticateToken } from '$middlewares/authMiddleware';

const router = Router();

// Data routes (some require authentication, analytics is public)
router.get('/analytics', DataController.getAnalytics);

// Protected routes
router.use(authenticateToken as any);
router.get('/products', DataController.getProducts as any);
router.get('/products/:id', DataController.getProductById);
router.get('/sales', DataController.getSalesRecords as any);
router.get('/sales/:id', DataController.getSalesRecordById);

export default router;
