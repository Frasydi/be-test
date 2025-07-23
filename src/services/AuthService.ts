import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.utils';
import { ValidationUtils } from '../validations';
import { SecurityUtils } from '../utils/security.utils';

export interface AuthServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName?: string | null;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: number;
    slug: string;
    email: string;
    fullName: string | null;
    role: string;
    createdAt: Date;
  };
  token: string;
}

export class AuthService {
  
  /**
   * Register a new user
   */
  static async register(data: RegisterData, clientIP: string, req: any): Promise<AuthServiceResponse<AuthResult>> {
    try {
      const { email, password, fullName } = data;

      // Check for suspicious activity
      const suspiciousCheck = SecurityUtils.checkSuspiciousActivity(req);
      if (suspiciousCheck.suspicious) {
        return {
          success: false,
          message: 'Suspicious activity detected. Please try again later.',
          statusCode: 429
        };
      }

      // Comprehensive validation
      const emailValidation = ValidationUtils.validateEmail(email);
      if (!emailValidation.isValid) {
        return {
          success: false,
          message: emailValidation.error?.message,
          statusCode: 400
        };
      }

      const passwordValidation = ValidationUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.error?.message,
          statusCode: 400
        };
      }

      const fullNameValidation = ValidationUtils.validateFullName(fullName);
      if (!fullNameValidation.isValid) {
        return {
          success: false,
          message: fullNameValidation.error?.message,
          statusCode: 400
        };
      }

      // Sanitize inputs
      const sanitizedEmail = ValidationUtils.sanitizeText(email).toLowerCase();
      const sanitizedFullName = fullName ? ValidationUtils.sanitizeText(fullName) : null;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
          statusCode: 400
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          password: hashedPassword,
          fullName: sanitizedFullName
        },
        select: {
          id: true,
          slug: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = this.generateToken(user.slug, user.email);

      return {
        success: true,
        data: {
          user,
          token
        },
        message: 'User registered successfully',
        statusCode: 201
      };

    } catch (error) {
      console.error('Registration service error:', error);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginData, clientIP: string, req: any): Promise<AuthServiceResponse<AuthResult>> {
    try {
      const { email, password } = data;

      // Check for suspicious activity
      const suspiciousCheck = SecurityUtils.checkSuspiciousActivity(req);
      if (suspiciousCheck.suspicious) {
        return {
          success: false,
          message: 'Suspicious activity detected. Please try again later.',
          statusCode: 429
        };
      }

      // Check rate limiting
      const rateLimitCheck = SecurityUtils.checkRateLimit(clientIP);
      if (!rateLimitCheck.allowed) {
        const resetTime = new Date(rateLimitCheck.resetTime!);
        return {
          success: false,
          message: `Too many login attempts. Please try again after ${resetTime.toLocaleTimeString()}.`,
          statusCode: 429
        };
      }

      // Comprehensive validation
      const emailValidation = ValidationUtils.validateEmail(email);
      if (!emailValidation.isValid) {
        SecurityUtils.recordFailedAttempt(clientIP);
        return {
          success: false,
          message: emailValidation.error?.message,
          statusCode: 400
        };
      }

      if (!password || typeof password !== 'string') {
        SecurityUtils.recordFailedAttempt(clientIP);
        return {
          success: false,
          message: 'Password is required',
          statusCode: 400
        };
      }

      if (password.length === 0) {
        SecurityUtils.recordFailedAttempt(clientIP);
        return {
          success: false,
          message: 'Password cannot be empty',
          statusCode: 400
        };
      }

      // Sanitize email input
      const sanitizedEmail = ValidationUtils.sanitizeText(email).toLowerCase();

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
        select: {
          id: true,
          slug: true,
          email: true,
          password: true,
          fullName: true,
          role: true,
          createdAt: true
        }
      });

      if (!user) {
        SecurityUtils.recordFailedAttempt(clientIP);
        return {
          success: false,
          message: 'Invalid credentials',
          statusCode: 401
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        SecurityUtils.recordFailedAttempt(clientIP);
        return {
          success: false,
          message: 'Invalid credentials',
          statusCode: 401
        };
      }

      // Clear failed attempts on successful login
      SecurityUtils.clearAttempts(clientIP);

      // Generate JWT token
      const token = this.generateToken(user.slug, user.email);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            slug: user.slug,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            createdAt: user.createdAt
          },
          token
        },
        message: 'Login successful',
        statusCode: 200
      };

    } catch (error) {
      console.error('Login service error:', error);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(userSlug: string, email: string): string {
    return jwt.sign(
      { userSlug, email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by slug
   */
  static async getUserBySlug(userSlug: string): Promise<AuthServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { slug: userSlug },
        select: {
          id: true,
          slug: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          statusCode: 404
        };
      }

      return {
        success: true,
        data: user,
        statusCode: 200
      };

    } catch (error) {
      console.error('Get user by slug service error:', error);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Get user by ID (kept for backward compatibility)
   */
  static async getUserById(userId: number): Promise<AuthServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          statusCode: 404
        };
      }

      return {
        success: true,
        data: user,
        statusCode: 200
      };

    } catch (error) {
      console.error('Get user service error:', error);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Update user profile by slug
   */
  static async updateProfileBySlug(userSlug: string, data: { fullName?: string }): Promise<AuthServiceResponse> {
    try {
      const { fullName } = data;

      // Validate fullName if provided
      if (fullName !== undefined) {
        const nameValidation = ValidationUtils.validateFullName(fullName);
        if (!nameValidation.isValid) {
          return {
            success: false,
            message: nameValidation.error?.message,
            statusCode: 400
          };
        }
      }

      // Sanitize input
      const sanitizedFullName = fullName ? ValidationUtils.sanitizeText(fullName) : undefined;

      const updatedUser = await prisma.user.update({
        where: { slug: userSlug },
        data: {
          fullName: sanitizedFullName
        },
        select: {
          id: true,
          slug: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
        statusCode: 200
      };

    } catch (error) {
      console.error('Update profile by slug service error:', error);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Update user profile by ID (kept for backward compatibility)
   */
  static async updateProfile(userId: number, data: { fullName?: string }): Promise<AuthServiceResponse> {
    try {
      const { fullName } = data;

      // Validate full name if provided
      if (fullName !== undefined) {
        const fullNameValidation = ValidationUtils.validateFullName(fullName);
        if (!fullNameValidation.isValid) {
          return {
            success: false,
            message: fullNameValidation.error?.message,
            statusCode: 400
          };
        }
      }

      const sanitizedFullName = fullName ? ValidationUtils.sanitizeText(fullName) : null;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: sanitizedFullName,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
        statusCode: 200
      };

    } catch (error) {
      console.error('Update profile service error:', error);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: 500
      };
    }
  }
}
