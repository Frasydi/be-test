import { Request, Response } from 'express';
import { AuthenticatedRequest } from '$middlewares/authMiddleware';
import { FileUploadService } from '$services/FileUploadService';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface FileUploadRequest extends AuthenticatedRequest {
  file?: UploadedFile;
}

export class FileUploadController {
  /**
   * Upload file endpoint
   * Handles actual file uploads with native Node.js implementation
   */
  static async uploadFile(req: FileUploadRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please upload a CSV or Excel file.'
        });
      }

      const fileData = {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      const result = await FileUploadService.uploadFile(fileData, req.user.id);

      // Clean up uploaded file if service operation fails
      if (!result.success && req.file.path) {
        FileUploadService.cleanupUploadedFile(req.file.path);
      }

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Upload file controller error:', error);
      
      // Clean up uploaded file on unexpected error
      if (req.file?.path) {
        FileUploadService.cleanupUploadedFile(req.file.path);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get list of uploaded files with filtering and pagination
   */
  static async getFiles(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const filterOptions = {
        page: req.query.page ? Number(req.query.page) : undefined,
        rows: req.query.rows ? Number(req.query.rows) : undefined,
        orderKey: req.query.orderKey as string,
        orderRule: req.query.orderRule as string,
        status: req.query.status as string,
        search: req.query.search as string
      };

      const result = await FileUploadService.getUserFiles(req.user.id, filterOptions);

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get files controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get specific file details
   */
  static async getFileById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await FileUploadService.getFileById(Number(id), req.user.id);

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get file by ID controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get processing status
   */
  static async getProcessingStatus(req: Request, res: Response) {
    try {
      const result = await FileUploadService.getProcessingStatus();

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get processing status controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await FileUploadService.deleteFile(Number(id), req.user.id);

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Delete file controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
