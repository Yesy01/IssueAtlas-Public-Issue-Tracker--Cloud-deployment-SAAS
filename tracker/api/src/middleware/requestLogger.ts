import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}
