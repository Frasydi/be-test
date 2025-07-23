import { ProcessingStatus } from '@prisma/client';
import { BasicExcelParser, ParsedRow } from '$utils/excelParser.utils';
import { prisma } from '$utils/prisma.utils';

export class BackgroundProcessor {
  private static processingQueue: Set<number> = new Set();

  /**
   * Add file to background processing queue
   */
  static async queueFileProcessing(fileUploadId: number): Promise<void> {
    if (this.processingQueue.has(fileUploadId)) {
      console.log(`File ${fileUploadId} is already in processing queue`);
      return;
    }

    this.processingQueue.add(fileUploadId);
    
    // Process asynchronously
    setImmediate(() => {
      this.processFile(fileUploadId)
        .finally(() => {
          this.processingQueue.delete(fileUploadId);
        });
    });
  }

  /**
   * Main file processing logic
   */
  private static async processFile(fileUploadId: number): Promise<void> {
    try {
      console.log(`Starting background processing for file ID: ${fileUploadId}`);

      // Update status to PROCESSING
      await prisma.fileUpload.update({
        where: { id: fileUploadId },
        data: { status: ProcessingStatus.PROCESSING }
      });

      // Get file details
      const fileUpload = await prisma.fileUpload.findUnique({
        where: { id: fileUploadId }
      });

      if (!fileUpload) {
        throw new Error('File upload record not found');
      }

      // Simulate reading file content (in real scenario, read from fileUrl or filePath)
      const fileContent = await this.readFileContent(fileUpload);
      
      // Parse the file
      const parseResult = BasicExcelParser.parse(fileContent, fileUpload.originalName);

      if (!parseResult.success) {
        throw new Error(`Parse failed: ${parseResult.errors.join(', ')}`);
      }

      // Process the parsed data
      await this.processData(fileUploadId, parseResult.data, parseResult.headers);

      // Update status to SUCCESS
      await prisma.fileUpload.update({
        where: { id: fileUploadId },
        data: { 
          status: ProcessingStatus.SUCCESS,
          processedAt: new Date(),
          recordsProcessed: parseResult.totalRows,
          totalRecords: parseResult.totalRows
        }
      });

      console.log(`Successfully processed file ID: ${fileUploadId}, Records: ${parseResult.totalRows}`);

    } catch (error) {
      console.error(`Error processing file ID ${fileUploadId}:`, error);

      // Update status to FAILED
      await prisma.fileUpload.update({
        where: { id: fileUploadId },
        data: { 
          status: ProcessingStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Read file content from uploaded file
   */
  private static async readFileContent(fileUpload: any): Promise<string> {
    const fs = require('fs').promises;
    
    try {
      // Read from the actual uploaded file path
      if (fileUpload.filePath) {
        const content = await fs.readFile(fileUpload.filePath, 'utf-8');
        return content;
      }
      
      throw new Error('File path not found');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process parsed data based on detected data type
   */
  private static async processData(fileUploadId: number, data: ParsedRow[], headers: string[]): Promise<void> {
    const dataType = this.detectDataType(headers);

    switch (dataType) {
      case 'products':
        await this.processProductData(fileUploadId, data);
        break;
      case 'sales':
        await this.processSalesData(fileUploadId, data);
        break;
      default:
        // Generic processing - store as products by default
        await this.processProductData(fileUploadId, data);
        break;
    }
  }

  /**
   * Detect data type based on headers
   */
  private static detectDataType(headers: string[]): 'products' | 'sales' | 'users' | 'unknown' {
    const headerStr = headers

    console.log(headerStr)

    if (headerStr.includes('sku') || headerStr.includes('product') || headerStr.includes('price')) {
      return 'products';
    }
    
    if (headerStr.includes('sale') || headerStr.includes('quantity') || headerStr.includes('customer')) {
      return 'sales';
    }

    if (headerStr.includes('email') || headerStr.includes('user') || headerStr.includes('name')) {
      return 'users';
    }

    return 'unknown';
  }

  /**
   * Process product data
   */
  private static async processProductData(fileUploadId: number, data: ParsedRow[]): Promise<void> {
    for (const row of data) {
      try {
        await prisma.product.create({
          data: {
            name: String(row.name || row.productName || 'Unknown Product'),
            sku: row.sku ? String(row.sku) : null,
            description: row.description ? String(row.description) : null,
            price: row.price ? Number(row.price) : null,
            category: row.category ? String(row.category) : null,
            stock: row.stock ? Number(row.stock) : 0,
            fileUploadId: fileUploadId
          }
        });
      } catch (error) {
        console.error('Error creating product:', error);
        // Continue processing other records
      }
    }
  }

  /**
   * Process sales data
   */
  private static async processSalesData(fileUploadId: number, data: ParsedRow[]): Promise<void> {
    for (const row of data) {
      try {
        await prisma.salesRecord.create({
          data: {
            productName: row.productName ? String(row.productName) : null,
            quantity: row.quantity ? Number(row.quantity) : 1,
            unitPrice: row.unitPrice || row.price ? Number(row.unitPrice || row.price) : 0,
            totalAmount: row.totalAmount ? Number(row.totalAmount) : 0,
            saleDate: row.saleDate instanceof Date ? row.saleDate : new Date(),
            customerName: row.customerName ? String(row.customerName) : null,
            customerEmail: row.customerEmail ? String(row.customerEmail) : null,
            region: row.region ? String(row.region) : null,
            fileUploadId: fileUploadId
          }
        });
      } catch (error) {
        console.error('Error creating sales record:', error);
        // Continue processing other records
      }
    }
  }

  /**
   * Get processing status
   */
  static getProcessingStatus(): { inProgress: number[], queueSize: number } {
    return {
      inProgress: Array.from(this.processingQueue),
      queueSize: this.processingQueue.size
    };
  }
}
