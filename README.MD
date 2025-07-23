# Nodewave Backend

A robust backend system for processing large Excel/CSV files with background processing, JWT authentication, and advanced dynamic filtering capabilities.

## 🚀 Project Overview

This system solves the problem of processing large Excel/CSV files without causing timeouts or blocking the user interface. When users upload files, the system immediately responds with success and processes the data in the background, providing real-time status updates.

### Key Features

- **🔐 JWT Authentication** - Secure user registration and login system
- **📁 File Upload & Processing** - Upload CSV files with immediate response
- **⚡ Background Processing** - Asynchronous file processing to prevent timeouts
- **🔍 Dynamic Filtering** - Advanced filtering and pagination using NodeWave's FilterQueryV2 system
- **📊 Data Management** - Store and retrieve products and sales data from processed files
- **📈 Statistics Dashboard** - Real-time system statistics and metrics

## 🛠️ Tech Stack

- **Language**: TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: MySQL
- **Authentication**: JWT + bcrypt
- **Logging**: Winston + Morgan
- **File Processing**: Custom CSV parser (no external libraries)

## 🏗️ How It Works

### 1. File Upload Flow
```
User uploads CSV → Immediate success response → Background processing queue → Parse & store data → Update status
```

### 2. Background Processing Architecture
- **In-Memory Queue**: Files are queued for processing using `setImmediate()`
- **Status Tracking**: Files progress through PENDING → PROCESSING → SUCCESS/FAILED
- **Data Type Detection**: System automatically detects if uploaded data contains products or sales records
- **Error Handling**: Failed processing is captured with detailed error messages

### 3. Dynamic Filtering System
The project uses NodeWave's advanced `FilterQueryV2` system that supports:
- **Multi-field filtering** with AND/OR logic
- **Search functionality** across multiple columns
- **Range filtering** for dates and numbers
- **Relational filtering** (one level deep)
- **Pagination** with customizable page sizes
- **Dynamic sorting** on any field

### 4. Data Models
```
User (Authentication)
├── FileUpload (Upload tracking)
    ├── Product (Parsed product data)
    └── SalesRecord (Parsed sales data)
```

## 📋 API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### File Upload & Processing

#### Upload File
```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "products.csv",
  "originalName": "products.csv",
  "fileContent": "name,sku,price,category,stock\nProduct A,SKU001,29.99,Electronics,100"
}
```

#### Get Files List (with filtering)
```http
GET /files?page=1&rows=10&status=SUCCESS&search=product
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `rows` - Items per page (default: 10)
- `status` - Filter by status (PENDING, PROCESSING, SUCCESS, FAILED)
- `search` - Search in fileName or originalName
- `orderKey` - Sort field (default: createdAt)
- `orderRule` - Sort direction (asc/desc, default: desc)

#### Other File Endpoints
```http
GET /files/:id                    # Get file details
DELETE /files/:id                 # Delete file
GET /files/processing-status      # Get processing queue status
```

### Data Retrieval

#### Get Products (with advanced filtering)
```http
GET /data/products?page=1&rows=10&category=Electronics&search=laptop&fileUploadId=1
Authorization: Bearer <token>
```

#### Get Sales Records (with date range filtering)
```http
GET /data/sales?page=1&rows=10&region=US&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

#### Get System Statistics
```http
GET /data/statistics
```

## 📁 Supported File Formats

The system supports CSV files with automatic data type detection:

### Product Data Format
```csv
name,sku,price,category,stock
"Laptop Pro 15","LP15-001",1299.99,"Electronics",50
"Wireless Mouse","WM-002",29.99,"Electronics",200
"Office Chair","OC-003",249.99,"Furniture",25
```

### Sales Data Format  
```csv
productName,quantity,unitPrice,totalAmount,saleDate,customerName,customerEmail,region
"Laptop Pro 15",1,1299.99,1299.99,"2024-01-15","John Smith","john@example.com","US"
"Wireless Mouse",2,29.99,59.98,"2024-01-16","Jane Doe","jane@example.com","EU"
```

## 🔄 Background Processing Flow

1. **Upload**: User uploads file via `/files/upload` → **Immediate success response**
2. **Queue**: File is queued for background processing using `setImmediate()`
3. **Process**: System processes file asynchronously:
   - Parses CSV content using custom parser
   - Detects data type (products/sales) based on headers
   - Stores records in appropriate database tables
   - Updates processing status and metrics
4. **Complete**: File status updated to SUCCESS or FAILED with detailed logs

## 🚀 Setup & Installation

### Prerequisites
- Node.js >= 16.14.2
- MySQL >= 8.0.3
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Configure your `.env` file:
```env
DATABASE_URL="mysql://username:password@localhost:3306/your_database"
SHADOW_DATABASE_URL="mysql://username:password@localhost:3306/shadow_db"
JWT_SECRET="your-super-secret-jwt-key"
NODE_LOCAL_PORT=3150
ENVIRONMENT=dev
ALLOWED_ORIGINS="*"
```

### 3. Database Setup
```bash
# Generate Prisma client (no migration needed for this setup)
npx prisma generate

# Create your database manually in MySQL
# The schema will be applied when you first run the app
```

### 4. Run the Application

**Development (with hot reload):**
```bash
npm run dev -- --service=rest
```

**Production:**
```bash
npm run build
npm start -- --service=rest
```

The server will start on `http://localhost:3150`

## 📖 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "entries": [...],
    "totalData": 100,
    "totalPage": 10,
    "currentPage": 1,
    "pageSize": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🧪 Testing the System

### Quick Test with cURL

1. **Register a user:**
```bash
curl -X POST http://localhost:3150/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'
```

2. **Login and get token:**
```bash
curl -X POST http://localhost:3150/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

3. **Upload a file:**
```bash
curl -X POST http://localhost:3150/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.csv","originalName":"test.csv","fileContent":"name,sku,price\nProduct A,SKU001,29.99"}'
```

4. **Check processing status:**
```bash
curl http://localhost:3150/files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🏗️ Project Architecture

```
src/
├── controllers/rest/          # HTTP request handlers
│   ├── AuthController.ts      # Authentication endpoints
│   ├── FileUploadController.ts # File upload & management
│   └── DataController.ts      # Data retrieval endpoints
├── services/                  # Business logic layer
│   ├── BackgroundProcessingService.ts # File processing queue
│   └── helpers/               # Service utilities
├── middlewares/               # Express middlewares
│   └── authMiddleware.ts      # JWT authentication
├── utils/                     # Utility functions
│   └── excelParser.utils.ts   # Custom CSV parser
├── entities/                  # TypeScript interfaces
├── routes/                    # API route definitions
└── prisma/                    # Database schema
```

## 🔧 Key Implementation Details

### Custom CSV Parser
- **No external libraries** - Built from scratch for flexibility
- **Type detection** - Automatically parses strings, numbers, dates
- **Quoted field support** - Handles CSV escaping and quotes
- **Error handling** - Graceful parsing with detailed error messages

### Background Processing
- **Non-blocking** - Uses `setImmediate()` for asynchronous processing
- **Status tracking** - Real-time status updates (PENDING → PROCESSING → SUCCESS/FAILED)
- **Error recovery** - Failed files are marked with detailed error messages
- **Memory efficient** - In-memory queue with reasonable limits

### Dynamic Filtering (FilterQueryV2)
- **Multi-field filtering** - Combine multiple filters with AND/OR logic
- **Search capabilities** - Full-text search across specified fields
- **Range filtering** - Date and numeric range filtering
- **Relational filtering** - Filter on related table fields (one level deep)
- **Flexible pagination** - Configurable page sizes and navigation

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **User Isolation** - Users can only access their own uploaded files
- **Input Validation** - Request validation and sanitization
- **Error Handling** - Secure error messages without sensitive data exposure

## 📊 Performance Considerations

- **Background Processing** - Prevents request timeouts for large files
- **Database Indexing** - Strategic indexes on frequently queried fields
- **Pagination** - Default limits to prevent large data transfers
- **Memory Management** - Efficient CSV parsing without loading entire files into memory

## 🚀 Production Considerations

For production deployment, consider:

- **File Storage** - Use cloud storage (AWS S3, Google Cloud) instead of in-memory content
- **Queue System** - Replace in-memory queue with Redis or message queue
- **Database Migration** - Use proper Prisma migrations
- **File Upload** - Implement proper multipart/form-data handling with multer
- **Error Monitoring** - Add error tracking (Sentry, etc.)
- **Rate Limiting** - Add request rate limiting
- **CORS Configuration** - Proper CORS setup for frontend integration

## 🤝 Contributing

This is a NodeWave base template. To add new features:

1. Create feature branch from `master`
2. Add new endpoints following the existing pattern
3. Update this documentation
4. Test thoroughly before merging

---

**Built with ❤️ by NodeWave Engineering**

  Here, we also follow domain based file naming, each domain will have 1 services, and maybe 1 helper service if needed, with the responsibility in service is only to do business logics, calling the db (we don't use repository since prisma orm is already more or less like a repository in it's nature). Please never mix up 3rd party integration here, as we already have the package for that, unless the 3rd party will also have controllers (like midtrans callback).


#### Routes, Validations and Middlewares

- `/routes` 

  This folders mainly has 3 parts 
  1. Domain based files ( e.g. : `ProductRoutes.ts` ), will contains all of the routings by domain 
  2. `RoutesRegistry.ts`, we pool all the routes exports here 
  3. index.ts -> we attach all the routes, pooled from `RoutesRegistry.ts` here

- `/validations` 

  Domain based, serve as a middleware, contains validation for any operation that involves sending request body, normally you will create the validation here,
  and use it on routes as a `middleware`.
 
  > [!WARNING]  
  > Don't use validation function inside controllers because it will cause an error if you do so.


- `/middlewares` 

  Here contains middlewares that can be used in the `/server/` directory or that can be used globally inside many routes, for example we have 
  `authMiddleware` for JWT authentication, `morganMiddleware` for http logging.