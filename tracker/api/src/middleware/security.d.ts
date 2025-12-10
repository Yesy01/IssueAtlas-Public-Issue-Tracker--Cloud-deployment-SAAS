import type { Request, Response, NextFunction } from 'express';
/**
 * XSS Prevention Middleware
 * Sanitizes all string values in request body only
 * Note: Query params and URL params are typically used for filtering/routing
 * and should be validated at the route level with proper validation libraries
 */
export declare function xssProtection(req: Request, res: Response, next: NextFunction): void;
/**
 * Content Security Policy headers
 */
export declare function cspHeaders(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=security.d.ts.map