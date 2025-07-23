import { Request, Response } from 'express';
import { AuthenticatedRequest } from '$middlewares/authMiddleware';
import { DataService } from '$services/DataService';

export class DataController {
  /**
   * Get products with filtering and pagination
   */
  static async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      // Parse filters parameter if it exists
      let filtersObject = {};
      if (req.query.filters) {
        try {
          filtersObject = typeof req.query.filters === 'string' 
            ? JSON.parse(req.query.filters) 
            : req.query.filters;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid filters format. Use filters={"category":"Electronics"}'
          });
        }
      }

      // Parse searchFilters parameter if it exists
      let searchFiltersObject = {};
      if (req.query.searchFilters) {
        try {
          searchFiltersObject = typeof req.query.searchFilters === 'string' 
            ? JSON.parse(req.query.searchFilters) 
            : req.query.searchFilters;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid searchFilters format. Use searchFilters={"name":"laptop"}'
          });
        }
      }

      // Parse rangedFilters parameter if it exists
      let rangedFiltersArray = [];
      if (req.query.rangedFilters) {
        try {
          rangedFiltersArray = typeof req.query.rangedFilters === 'string' 
            ? JSON.parse(req.query.rangedFilters) 
            : req.query.rangedFilters;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid rangedFilters format. Use rangedFilters=[{"key":"price","start":50000,"end":60000}]'
          });
        }
      }

      const filterOptions = {
        page: req.query.page ? Number(req.query.page) : undefined,
        rows: req.query.rows ? Number(req.query.rows) : undefined,
        orderKey: req.query.orderKey as string,
        orderRule: req.query.orderRule as string,
        filters: filtersObject,
        searchFilters: searchFiltersObject,
        rangedFilters: rangedFiltersArray
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
      // Parse filters parameter if it exists
      let filtersObject = {};
      if (req.query.filters) {
        try {
          filtersObject = typeof req.query.filters === 'string' 
            ? JSON.parse(req.query.filters) 
            : req.query.filters;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid filters format. Use filters={"region":"US"}'
          });
        }
      }

      // Parse searchFilters parameter if it exists
      let searchFiltersObject = {};
      if (req.query.searchFilters) {
        try {
          searchFiltersObject = typeof req.query.searchFilters === 'string' 
            ? JSON.parse(req.query.searchFilters) 
            : req.query.searchFilters;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid searchFilters format. Use searchFilters={"customerName":"john"}'
          });
        }
      }

      // Parse rangedFilters parameter if it exists
      let rangedFiltersArray = [];
      if (req.query.rangedFilters) {
        try {
          rangedFiltersArray = typeof req.query.rangedFilters === 'string' 
            ? JSON.parse(req.query.rangedFilters) 
            : req.query.rangedFilters;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid rangedFilters format. Use rangedFilters=[{"key":"price","start":50000,"end":60000}]'
          });
        }
      }

      const filterOptions = {
        page: req.query.page ? Number(req.query.page) : undefined,
        rows: req.query.rows ? Number(req.query.rows) : undefined,
        orderKey: req.query.orderKey as string,
        orderRule: req.query.orderRule as string,
        filters: filtersObject,
        searchFilters: searchFiltersObject,
        rangedFilters: rangedFiltersArray,
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
