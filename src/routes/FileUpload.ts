import { Router } from 'express';
import { FileUploadController } from '$controllers/rest/FileUploadController';
import { authenticateToken } from '$middlewares/authMiddleware';
import { uploadSingleFile } from '$middlewares/uploadMiddleware';

const router = Router();

// All file upload routes require authentication
router.use(authenticateToken as any);

// File upload routes
router.post('/upload', uploadSingleFile, FileUploadController.uploadFile as any);
router.get('/', FileUploadController.getFiles as any);
router.get('/processing-status', FileUploadController.getProcessingStatus);
router.get('/:id', FileUploadController.getFileById as any);
router.delete('/:id', FileUploadController.deleteFile as any);

export default router;
