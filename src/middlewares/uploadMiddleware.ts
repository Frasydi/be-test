import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { IncomingMessage } from 'http';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

interface ParsedFile {
  fieldname: string;
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  buffer: Buffer;
}

// File validation function
const validateFile = (file: ParsedFile): { isValid: boolean; error?: string } => {
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/csv',
    'text/plain'
  ];

  const allowedExtensions = ['.csv', '.xls', '.xlsx', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Check file size (100MB limit)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 100MB limit' };
  }

  // Check file type
  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'Invalid file type. Only CSV, Excel files are allowed.' };
  }

  return { isValid: true };
};

// Generate unique filename
const generateUniqueFilename = (originalFilename: string): string => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const extension = path.extname(originalFilename);
  const basename = path.basename(originalFilename, extension);
  return `${basename}-${uniqueSuffix}${extension}`;
};

// Parse multipart form data manually
const parseMultipartData = (req: IncomingMessage, boundary: string): Promise<{ fields: any; files: ParsedFile[] }> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const fields: any = {};
    const files: ParsedFile[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks as any);
        const boundaryBuffer = Buffer.from(`--${boundary}`);
        const parts = [];
        
        let start = 0;
        let end = buffer.indexOf(boundaryBuffer as any, start);
        
        while (end !== -1) {
          if (start !== 0) {
            parts.push(buffer.slice(start, end));
          }
          start = end + boundaryBuffer.length;
          end = buffer.indexOf(boundaryBuffer as any, start);
        }

        for (const part of parts) {
          if (part.length === 0) continue;
          
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;
          
          const headers = part.slice(0, headerEnd).toString();
          const body = part.slice(headerEnd + 4, part.length - 2);
          
          const contentDisposition = headers.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/);
          if (!contentDisposition) continue;
          
          const fieldName = contentDisposition[1];
          const filename = contentDisposition[2];
          
          if (filename) {
            // This is a file
            const contentType = headers.match(/Content-Type: ([^\r\n]+)/);
            const mimetype = contentType ? contentType[1] : 'application/octet-stream';
            
            const uniqueFilename = generateUniqueFilename(filename);
            const filePath = path.join(uploadDir, uniqueFilename);
            
            files.push({
              fieldname: fieldName,
              originalname: filename,
              filename: uniqueFilename,
              path: filePath,
              size: body.length,
              mimetype: mimetype,
              buffer: body
            });
          } else {
            // This is a regular field
            fields[fieldName] = body.toString();
          }
        }
        
        resolve({ fields, files });
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
};

// Native file upload middleware
export const uploadSingleFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType = req.headers['content-type'];
    const contentLength = req.headers['content-length'];
    
    // Check if there's any body content
    if (!contentLength || contentLength === '0') {
      return res.status(400).json({
        success: false,
        message: 'No file data received. Please use form-data in Postman and select a file.'
      });
    }
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type must be multipart/form-data. Please use form-data option in Postman Body tab.'
      });
    }

    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid multipart boundary'
      });
    }

    const boundary = boundaryMatch[1];
    const { fields, files } = await parseMultipartData(req, boundary);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (files.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Only one file is allowed'
      });
    }

    const file = files[0];

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Write file to disk
    fs.writeFileSync(file.path, file.buffer as any);

    // Add file info to request object (compatible with original multer format)
    (req as any).file = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    };

    // Add fields to request body
    req.body = { ...req.body, ...fields };

    next();
  } catch (error) {
    console.error('Error processing file upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing file upload'
    });
  }
};
