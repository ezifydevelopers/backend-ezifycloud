import { Request, Response, NextFunction } from 'express';
import { APP_CONFIG } from '../config/app';

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production
 */
export const enforceHTTPS = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only enforce in production
  if (APP_CONFIG.SERVER.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // Redirect to HTTPS
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  res.redirect(301, httpsUrl);
};

/**
 * Security headers middleware
 * Adds additional security headers beyond Helmet
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
  );

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
};

/**
 * Request ID middleware
 * Adds a unique request ID for tracking
 */
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

