import { prisma } from '../utils/prisma.utils';
import { buildFilterQueryLimitOffsetV2 } from './helpers/FilterQueryV2';
import { FilteringQueryV2 } from '../entities/Query';

export interface DataServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export interface ProductFilterQuery {
  page?: number;
  rows?: number;
  orderKey?: string;
  orderRule?: string;
  category?: string;
  fileUploadId?: number;
  search?: string;
}

export interface SalesRecordFilterQuery {
  page?: number;
  rows?: number;
  orderKey?: string;
  orderRule?: string;
  productId?: number;
  fileUploadId?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class DataService {
  
  /**
   * Get products with filtering and pagination
   */
  static async getProducts(filterOptions: ProductFilterQuery): Promise<DataServiceResponse> {
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

      // Add category filter if provided
      if (filterOptions.category) {
        filterQuery.filters!.category = filterOptions.category;
      }

      // Add fileUploadId filter if provided
      if (filterOptions.fileUploadId) {
        filterQuery.filters!.fileUploadId = filterOptions.fileUploadId;
      }

      // Add search by name if provided
      if (filterOptions.search) {
        filterQuery.searchFilters!.name = filterOptions.search;
        filterQuery.searchFilters!.sku = filterOptions.search;
      }

      // Build Prisma query
      const prismaQuery = buildFilterQueryLimitOffsetV2(filterQuery);

      // Get products and total count
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          ...prismaQuery,
          include: {
            fileUpload: {
              select: {
                id: true,
                fileName: true,
                originalName: true,
                createdAt: true
              }
            }
          }
        }),
        prisma.product.count({
          where: prismaQuery.where
        })
      ]);

      const totalPages = Math.ceil(totalCount / (filterQuery.rows || 10));

      return {
        success: true,
        data: {
          entries: products,
          totalData: totalCount,
          totalPage: totalPages,
          currentPage: filterQuery.page || 1,
          pageSize: filterQuery.rows || 10
        },
        statusCode: 200
      };

    } catch (error) {
      console.error('Get products service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve products',
        statusCode: 500
      };
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId: number): Promise<DataServiceResponse> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          fileUpload: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              createdAt: true
            }
          },
          salesRecords: {
            take: 10,
            orderBy: {
              createdAt: 'desc'
            },
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalAmount: true,
              saleDate: true,
              customerName: true
            }
          }
        }
      });

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          statusCode: 404
        };
      }

      return {
        success: true,
        data: product,
        statusCode: 200
      };

    } catch (error) {
      console.error('Get product by ID service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve product',
        statusCode: 500
      };
    }
  }

  /**
   * Get sales records with filtering and pagination
   */
  static async getSalesRecords(filterOptions: SalesRecordFilterQuery): Promise<DataServiceResponse> {
    try {
      // Build filter query from options
      const filterQuery: FilteringQueryV2 = {
        page: filterOptions.page || 1,
        rows: filterOptions.rows || 10,
        orderKey: filterOptions.orderKey || 'saleDate',
        orderRule: filterOptions.orderRule || 'desc',
        filters: {},
        searchFilters: {}
      };

      // Add productId filter if provided
      if (filterOptions.productId) {
        filterQuery.filters!.productId = filterOptions.productId;
      }

      // Add fileUploadId filter if provided
      if (filterOptions.fileUploadId) {
        filterQuery.filters!.fileUploadId = filterOptions.fileUploadId;
      }

      // Add search by customer name or product name if provided
      if (filterOptions.search) {
        filterQuery.searchFilters!.customerName = filterOptions.search;
        filterQuery.searchFilters!.productName = filterOptions.search;
      }

      // Build Prisma query
      const prismaQuery = buildFilterQueryLimitOffsetV2(filterQuery);

      // Add date range filter if provided
      if (filterOptions.startDate || filterOptions.endDate) {
        const dateFilter: any = {};
        if (filterOptions.startDate) {
          dateFilter.gte = new Date(filterOptions.startDate);
        }
        if (filterOptions.endDate) {
          dateFilter.lte = new Date(filterOptions.endDate);
        }
        prismaQuery.where.AND.push({
          saleDate: dateFilter
        });
      }

      // Get sales records and total count
      const [salesRecords, totalCount] = await Promise.all([
        prisma.salesRecord.findMany({
          ...prismaQuery,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true
              }
            },
            fileUpload: {
              select: {
                id: true,
                fileName: true,
                originalName: true,
                createdAt: true
              }
            }
          }
        }),
        prisma.salesRecord.count({
          where: prismaQuery.where
        })
      ]);

      const totalPages = Math.ceil(totalCount / (filterQuery.rows || 10));

      return {
        success: true,
        data: {
          entries: salesRecords,
          totalData: totalCount,
          totalPage: totalPages,
          currentPage: filterQuery.page || 1,
          pageSize: filterQuery.rows || 10
        },
        statusCode: 200
      };

    } catch (error) {
      console.error('Get sales records service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve sales records',
        statusCode: 500
      };
    }
  }

  /**
   * Get sales record by ID
   */
  static async getSalesRecordById(recordId: number): Promise<DataServiceResponse> {
    try {
      const salesRecord = await prisma.salesRecord.findUnique({
        where: { id: recordId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              price: true
            }
          },
          fileUpload: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              createdAt: true
            }
          }
        }
      });

      if (!salesRecord) {
        return {
          success: false,
          message: 'Sales record not found',
          statusCode: 404
        };
      }

      return {
        success: true,
        data: salesRecord,
        statusCode: 200
      };

    } catch (error) {
      console.error('Get sales record by ID service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve sales record',
        statusCode: 500
      };
    }
  }

  /**
   * Get analytics/summary data
   */
  static async getAnalytics(): Promise<DataServiceResponse> {
    try {
      const [
        totalProducts,
        totalSalesRecords,
        totalRevenue,
        recentProducts,
        recentSales
      ] = await Promise.all([
        prisma.product.count(),
        prisma.salesRecord.count(),
        prisma.salesRecord.aggregate({
          _sum: {
            totalAmount: true
          }
        }),
        prisma.product.findMany({
          take: 5,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            name: true,
            category: true,
            createdAt: true
          }
        }),
        prisma.salesRecord.findMany({
          take: 5,
          orderBy: {
            saleDate: 'desc'
          },
          select: {
            id: true,
            productName: true,
            totalAmount: true,
            saleDate: true,
            customerName: true
          }
        })
      ]);

      return {
        success: true,
        data: {
          summary: {
            totalProducts,
            totalSalesRecords,
            totalRevenue: totalRevenue._sum.totalAmount || 0
          },
          recentProducts,
          recentSales
        },
        statusCode: 200
      };

    } catch (error) {
      console.error('Get analytics service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve analytics',
        statusCode: 500
      };
    }
  }
}
