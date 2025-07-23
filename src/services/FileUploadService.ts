import { prisma } from '../utils/prisma.utils';
import { BackgroundProcessor } from './BackgroundProcessingService';
import { buildFilterQueryLimitOffsetV2 } from './helpers/FilterQueryV2';
import { FilteringQueryV2 } from '../entities/Query';
import * as fs from 'fs';

export interface FileUploadServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export interface FileUploadData {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface FileFilterQuery {
  page?: number;
  rows?: number;
  orderKey?: string;
  orderRule?: string;
  status?: string;
  search?: string;
}

export class FileUploadService {
  
  /**
   * Upload and create file record
   */
  static async uploadFile(fileData: FileUploadData, userId: number): Promise<FileUploadServiceResponse> {
    try {
      const { originalname, filename, path: filePath, size, mimetype } = fileData;

      // Create file upload record
      const fileUpload = await prisma.fileUpload.create({
        data: {
          fileName: filename,
          originalName: originalname,
          fileSize: size,
          mimeType: mimetype,
          uploadedBy: userId,
          filePath: filePath,
          fileUrl: `uploads/${filename}`
        }
      });

      // Queue for background processing
      BackgroundProcessor.queueFileProcessing(fileUpload.id);

      return {
        success: true,
        data: {
          id: fileUpload.id,
          fileName: fileUpload.fileName,
          originalName: fileUpload.originalName,
          fileSize: fileUpload.fileSize,
          mimeType: fileUpload.mimeType,
          status: fileUpload.status,
          createdAt: fileUpload.createdAt
        },
        message: 'File uploaded successfully and queued for processing',
        statusCode: 201
      };

    } catch (error) {
      console.error('File upload service error:', error);
      return {
        success: false,
        message: 'Failed to create file upload record',
        statusCode: 500
      };
    }
  }

  /**
   * Get user's files with filtering and pagination
   */
  static async getUserFiles(userId: number, filterOptions: FileFilterQuery): Promise<FileUploadServiceResponse> {
    try {
      // Build filter query from options
      const filterQuery: FilteringQueryV2 = {
        page: filterOptions.page || 1,
        rows: filterOptions.rows || 10,
        orderKey: filterOptions.orderKey || 'createdAt',
        orderRule: filterOptions.orderRule || 'desc',
        filters: {},
        searchFilters: {}
      };

      // Add status filter if provided
      if (filterOptions.status) {
        filterQuery.filters!.status = filterOptions.status;
      }

      // Add search by filename if provided
      if (filterOptions.search) {
        filterQuery.searchFilters!.fileName = filterOptions.search;
        filterQuery.searchFilters!.originalName = filterOptions.search;
      }

      // Build Prisma query
      const prismaQuery = buildFilterQueryLimitOffsetV2(filterQuery);
      
      // Add user filter (users can only see their own files)
      prismaQuery.where.AND.push({
        uploadedBy: userId
      });

      // Get files and total count
      const [files, totalCount] = await Promise.all([
        prisma.fileUpload.findMany({
          ...prismaQuery,
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileSize: true,
            mimeType: true,
            status: true,
            processedAt: true,
            errorMessage: true,
            recordsProcessed: true,
            totalRecords: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.fileUpload.count({
          where: prismaQuery.where
        })
      ]);

      const totalPages = Math.ceil(totalCount / (filterQuery.rows || 10));

      return {
        success: true,
        data: {
          entries: files,
          totalData: totalCount,
          totalPage: totalPages,
          currentPage: filterQuery.page || 1,
          pageSize: filterQuery.rows || 10
        },
        statusCode: 200
      };

    } catch (error) {
      console.error('Get user files service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve files',
        statusCode: 500
      };
    }
  }

  /**
   * Get specific file by ID for user
   */
  static async getFileById(fileId: number, userId: number): Promise<FileUploadServiceResponse> {
    try {
      const fileUpload = await prisma.fileUpload.findFirst({
        where: {
          id: fileId,
          uploadedBy: userId
        },
        include: {
          products: {
            take: 5,
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              category: true
            }
          },
          salesRecords: {
            take: 5,
            select: {
              id: true,
              productName: true,
              quantity: true,
              totalAmount: true,
              customerName: true
            }
          }
        }
      });

      if (!fileUpload) {
        return {
          success: false,
          message: 'File not found',
          statusCode: 404
        };
      }

      return {
        success: true,
        data: fileUpload,
        statusCode: 200
      };

    } catch (error) {
      console.error('Get file by ID service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve file',
        statusCode: 500
      };
    }
  }

  /**
   * Delete file and associated data
   */
  static async deleteFile(fileId: number, userId: number): Promise<FileUploadServiceResponse> {
    try {
      // Check if file exists and belongs to user
      const fileUpload = await prisma.fileUpload.findFirst({
        where: {
          id: fileId,
          uploadedBy: userId
        }
      });

      if (!fileUpload) {
        return {
          success: false,
          message: 'File not found',
          statusCode: 404
        };
      }

      // Delete associated records first (if needed)
      await Promise.all([
        prisma.product.deleteMany({
          where: { fileUploadId: fileId }
        }),
        prisma.salesRecord.deleteMany({
          where: { fileUploadId: fileId }
        })
      ]);

      // Delete physical file if it exists
      if (fileUpload.filePath && fs.existsSync(fileUpload.filePath)) {
        try {
          fs.unlinkSync(fileUpload.filePath);
        } catch (fileError) {
          console.error('Failed to delete physical file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete file upload record
      await prisma.fileUpload.delete({
        where: { id: fileId }
      });

      return {
        success: true,
        message: 'File and associated data deleted successfully',
        statusCode: 200
      };

    } catch (error) {
      console.error('Delete file service error:', error);
      return {
        success: false,
        message: 'Failed to delete file',
        statusCode: 500
      };
    }
  }

  /**
   * Get processing status
   */
  static async getProcessingStatus(): Promise<FileUploadServiceResponse> {
    try {
      const status = BackgroundProcessor.getProcessingStatus();
      
      return {
        success: true,
        data: status,
        statusCode: 200
      };

    } catch (error) {
      console.error('Get processing status service error:', error);
      return {
        success: false,
        message: 'Failed to get processing status',
        statusCode: 500
      };
    }
  }

  /**
   * Clean up uploaded file (utility method)
   */
  static cleanupUploadedFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup uploaded file:', error);
    }
  }
}
