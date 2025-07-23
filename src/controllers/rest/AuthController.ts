import { Request, Response } from 'express';
import { AuthService } from '../../services/AuthService';
import { SecurityUtils } from '../../utils/security.utils';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName } = req.body;
      const clientIP = SecurityUtils.getClientIP(req);

      const result = await AuthService.register(
        { email, password, fullName },
        clientIP,
        req
      );

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Registration controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const clientIP = SecurityUtils.getClientIP(req);

      const result = await AuthService.login(
        { email, password },
        clientIP,
        req
      );

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Login controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userSlug = req.user?.slug;

      if (!userSlug) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await AuthService.getUserBySlug(userSlug);

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Get profile controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userSlug = req.user?.slug;
      const { fullName } = req.body;

      if (!userSlug) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await AuthService.updateProfileBySlug(userSlug, { fullName });

      return res.status(result.statusCode || 500).json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('Update profile controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
