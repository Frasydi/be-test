export interface ParsedRow {
  [key: string]: string | number | Date | null;
}

export interface ParseResult {
  success: boolean;
  data: ParsedRow[];
  headers: string[];
  totalRows: number;
  errors: string[];
}

export class BasicExcelParser {
  /**
   * Parse CSV content (basic implementation)
   * Supports comma-separated values with quoted fields
   */
  static parseCSV(content: string): ParseResult {
    try {
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        return {
          success: false,
          data: [],
          headers: [],
          totalRows: 0,
          errors: ['File is empty']
        };
      }

      // Parse headers (first row)
      const headers = this.parseCSVRow(lines[0]);
      const data: ParsedRow[] = [];
      const errors: string[] = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const row = this.parseCSVRow(lines[i]);
          if (row.length === 0) continue; // Skip empty rows

          const parsedRow: ParsedRow = {};
          headers.forEach((header, index) => {
            const value = row[index] || null;
            parsedRow[header.trim()] = this.parseValue(value);
          });

          data.push(parsedRow);
        } catch (error) {
          errors.push(`Error parsing row ${i + 1}: ${error}`);
        }
      }

      return {
        success: true,
        data,
        headers: headers.map(h => h.trim()),
        totalRows: data.length,
        errors
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        headers: [],
        totalRows: 0,
        errors: [`Parse error: ${error}`]
      };
    }
  }

  /**
   * Parse a single CSV row, handling quoted fields
   */
  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);
    return result;
  }

  /**
   * Parse individual cell values with type detection
   */
  private static parseValue(value: string | null): string | number | Date | null {
    if (!value || value.trim() === '') {
      return null;
    }

    const trimmed = value.trim();

    // Remove quotes if present
    const unquoted = trimmed.replace(/^["']|["']$/g, '');

    // Try to parse as number
    if (!isNaN(Number(unquoted)) && unquoted !== '') {
      return Number(unquoted);
    }

    // Try to parse as date (basic patterns)
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/,           // MM-DD-YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO datetime
    ];

    for (const pattern of datePatterns) {
      if (pattern.test(unquoted)) {
        const date = new Date(unquoted);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return unquoted;
  }

  /**
   * Detect file type based on extension or content
   */
  static detectFileType(filename: string, content?: string): 'csv' | 'excel' | 'unknown' {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'csv':
        return 'csv';
      case 'xls':
      case 'xlsx':
        return 'excel';
      default:
        // Try to detect based on content
        if (content && content.includes(',')) {
          return 'csv';
        }
        return 'unknown';
    }
  }

  /**
   * Main parsing method that handles different file types
   */
  static parse(content: string, filename: string): ParseResult {
    const fileType = this.detectFileType(filename, content);

    switch (fileType) {
      case 'csv':
        return this.parseCSV(content);
      case 'excel':
        // For now, treat Excel files as CSV (user needs to save as CSV)
        return {
          success: false,
          data: [],
          headers: [],
          totalRows: 0,
          errors: ['Excel files are not supported. Please convert to CSV format.']
        };
      default:
        return {
          success: false,
          data: [],
          headers: [],
          totalRows: 0,
          errors: ['Unsupported file format. Please use CSV files.']
        };
    }
  }
}
