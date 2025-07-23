import { ErrorStructure, generateErrorStructure } from './helper';

export interface ValidationResult {
  isValid: boolean;
  error?: ErrorStructure;
}

export class ValidationUtils {
  // Email validation using regex
  static validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: generateErrorStructure('email', 'Email is required') };
    }

    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length === 0) {
      return { isValid: false, error: generateErrorStructure('email', 'Email cannot be empty') };
    }

    if (trimmedEmail.length > 254) {
      return { isValid: false, error: generateErrorStructure('email', 'Email address is too long') };
    }

    // RFC 5322 compliant email regex (simplified but robust)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: generateErrorStructure('email', 'Please provide a valid email address') };
    }

    // Additional checks for common issues
    if (trimmedEmail.includes('..')) {
      return { isValid: false, error: generateErrorStructure('email', 'Email cannot contain consecutive dots') };
    }

    if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      return { isValid: false, error: generateErrorStructure('email', 'Email cannot start or end with a dot') };
    }

    return { isValid: true };
  }

  // Password validation with multiple criteria
  static validatePassword(password: string): ValidationResult {
    if (!password || typeof password !== 'string') {
      return { isValid: false, error: generateErrorStructure('password', 'Password is required') };
    }

    if (password.length < 8) {
      return { isValid: false, error: generateErrorStructure('password', 'Password must be at least 8 characters long') };
    }

    if (password.length > 128) {
      return { isValid: false, error: generateErrorStructure('password', 'Password is too long (maximum 128 characters)') };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: generateErrorStructure('password', 'Password must contain at least one lowercase letter') };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: generateErrorStructure('password', 'Password must contain at least one uppercase letter') };
    }

    // Check for at least one digit
    if (!/\d/.test(password)) {
      return { isValid: false, error: generateErrorStructure('password', 'Password must contain at least one number') };
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { isValid: false, error: generateErrorStructure('password', 'Password must contain at least one special character') };
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '12345678', 'qwerty123',
      'admin123', 'welcome123', 'letmein123', 'password1'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      return { isValid: false, error: generateErrorStructure('password', 'Password is too common. Please choose a stronger password') };
    }

    return { isValid: true };
  }

  // Full name validation
  static validateFullName(fullName: string | null | undefined): ValidationResult {
    // Full name is optional, so null/undefined is valid
    if (fullName === null || fullName === undefined) {
      return { isValid: true };
    }

    if (typeof fullName !== 'string') {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name must be a string') };
    }

    const trimmedName = fullName.trim();

    // If provided, it cannot be empty
    if (trimmedName.length === 0) {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name cannot be empty if provided') };
    }

    if (trimmedName.length > 100) {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name is too long (maximum 100 characters)') };
    }

    if (trimmedName.length < 2) {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name must be at least 2 characters long') };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name can only contain letters, spaces, hyphens, apostrophes, and dots') };
    }

    // Check for excessive consecutive spaces
    if (/\s{3,}/.test(trimmedName)) {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name cannot contain excessive spaces') };
    }

    // Check for starting/ending with special characters
    if (/^[\s\-'\.]+|[\s\-'\.]+$/.test(trimmedName)) {
      return { isValid: false, error: generateErrorStructure('fullName', 'Full name cannot start or end with spaces or special characters') };
    }

    return { isValid: true };
  }

  // Sanitize input to prevent basic injection attacks
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove basic HTML characters
      .replace(/['"]/g, '') // Remove quotes that could be used in SQL injection
      .replace(/[\\]/g, ''); // Remove backslashes
  }

  // General text validation
  static validateText(text: string, fieldName: string, minLength: number = 1, maxLength: number = 255): ValidationResult {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: generateErrorStructure(fieldName, `${fieldName} is required`) };
    }

    const trimmedText = text.trim();

    if (trimmedText.length < minLength) {
      return { isValid: false, error: generateErrorStructure(fieldName, `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''} long`) };
    }

    if (trimmedText.length > maxLength) {
      return { isValid: false, error: generateErrorStructure(fieldName, `${fieldName} is too long (maximum ${maxLength} characters)`) };
    }

    // Check for potentially malicious content
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /delete.*from/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmedText)) {
        return { isValid: false, error: generateErrorStructure(fieldName, `${fieldName} contains invalid content`) };
      }
    }

    return { isValid: true };
  }
}
