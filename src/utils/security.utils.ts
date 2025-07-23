export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export class SecurityUtils {
  private static attempts: Map<string, RateLimitInfo> = new Map();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // Simple rate limiting for login attempts
  static checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts?: number; resetTime?: number } {
    const now = Date.now();
    const attempts = this.attempts.get(identifier);

    // Clean up expired entries
    this.cleanupExpiredAttempts(now);

    if (!attempts) {
      // First attempt
      this.attempts.set(identifier, { count: 1, resetTime: now + this.WINDOW_MS });
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS - 1 };
    }

    if (now > attempts.resetTime) {
      // Window has expired, reset
      this.attempts.set(identifier, { count: 1, resetTime: now + this.WINDOW_MS });
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS - 1 };
    }

    if (attempts.count >= this.MAX_ATTEMPTS) {
      // Rate limit exceeded
      return { 
        allowed: false, 
        remainingAttempts: 0,
        resetTime: attempts.resetTime
      };
    }

    // Increment attempts
    attempts.count++;
    return { 
      allowed: true, 
      remainingAttempts: this.MAX_ATTEMPTS - attempts.count 
    };
  }

  // Record failed login attempt
  static recordFailedAttempt(identifier: string): void {
    this.checkRateLimit(identifier);
  }

  // Clear attempts for successful login
  static clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // Clean up expired entries to prevent memory leaks
  private static cleanupExpiredAttempts(now: number): void {
    for (const [key, value] of this.attempts.entries()) {
      if (now > value.resetTime) {
        this.attempts.delete(key);
      }
    }
  }

  // Get client IP address from request
  static getClientIP(req: any): string {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      '127.0.0.1'
    );
  }

  // Simple password strength checker
  static getPasswordStrength(password: string): { score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    return { score, feedback };
  }

  // Check for suspicious request patterns
  static checkSuspiciousActivity(req: any): { suspicious: boolean; reason?: string } {
    const userAgent = req.headers['user-agent'];

    // Check for missing user agent (common in bots)
    if (!userAgent) {
      return { suspicious: true, reason: 'Missing user agent' };
    }

    // Check for common bot user agents
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ];

    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        return { suspicious: true, reason: 'Bot-like user agent detected' };
      }
    }

    // Check for suspicious content-types for auth endpoints
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
      return { suspicious: true, reason: 'Unusual content type' };
    }

    return { suspicious: false };
  }
}
