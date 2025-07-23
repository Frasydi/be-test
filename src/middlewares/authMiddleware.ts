import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

interface JwtPayload {
  userSlug: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    slug: string;
    email: string;
    fullName?: string;
    role?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = AuthService.verifyToken(token) as JwtPayload;
    
    if (!decoded) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Get user from database using AuthService
    const userResult = await AuthService.getUserBySlug(decoded.userSlug);

    if (!userResult.success || !userResult.data) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    req.user = {
      id: userResult.data.id,
      slug: userResult.data.slug,
      email: userResult.data.email,
      fullName: userResult.data.fullName || undefined,
      role: userResult.data.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};
