import { Request, Response } from 'express';
import { AuthenticatedRequest } from '$middlewares/authMiddleware';
import { DataService } from '$services/DataService';

export class DataController {
  /**
   * Get products with filtering and pagination
   */
  static async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      // Parse filter parameter if it exists
      let filterObject = {};
      if (req.query.filter) {
        try {
          filterObject = typeof req.query.filter === 'string' 
            ? JSON.parse(req.query.filter) 
            : req.query.filter;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid filter format. Use filter={name:"Fachri"}'
          });
        }
      }

      const filterOptions = {
        page: req.query.page ? Number(req.query.page) : undefined,
        rows: req.query.rows ? Number(req.query.rows) : undefined,
        orderKey: req.query.orderKey as string,
        orderRule: req.query.orderRule as string,
        category: req.query.category as string,
        fileUploadId: req.query.fileUploadId ? Number(req.query.fileUploadId) : undefined,
        filter: filterObject
      };

      const result = await DataService.getProducts(filterOptions);

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get products controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await DataService.getProductById(Number(id));

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get product by ID controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sales records with filtering and pagination
   */
  static async getSalesRecords(req: AuthenticatedRequest, res: Response) {
    try {
      // Parse filter parameter if it exists
      let filterObject = {};
      if (req.query.filter) {
        try {
          filterObject = typeof req.query.filter === 'string' 
            ? JSON.parse(req.query.filter) 
            : req.query.filter;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid filter format. Use filter={name:"Fachri"}'
          });
        }
      }

      const filterOptions = {
        page: req.query.page ? Number(req.query.page) : undefined,
        rows: req.query.rows ? Number(req.query.rows) : undefined,
        orderKey: req.query.orderKey as string,
        orderRule: req.query.orderRule as string,
        productId: req.query.productId ? Number(req.query.productId) : undefined,
        fileUploadId: req.query.fileUploadId ? Number(req.query.fileUploadId) : undefined,
        filter: filterObject,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await DataService.getSalesRecords(filterOptions);

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get sales records controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sales record by ID
   */
  static async getSalesRecordById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await DataService.getSalesRecordById(Number(id));

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get sales record by ID controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get analytics/summary data
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const result = await DataService.getAnalytics();

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get analytics controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
