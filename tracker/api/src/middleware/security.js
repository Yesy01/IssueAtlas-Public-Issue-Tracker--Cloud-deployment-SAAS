"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssProtection = xssProtection;
exports.cspHeaders = cspHeaders;
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
/**
 * XSS Prevention Middleware
 * Sanitizes all string values in request body only
 * Note: Query params and URL params are typically used for filtering/routing
 * and should be validated at the route level with proper validation libraries
 */
function xssProtection(req, res, next) {
    // Sanitize request body (this is mutable)
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}
/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}
/**
 * Sanitize individual string values
 */
function sanitizeString(str) {
    // DOMPurify removes all HTML tags and malicious code
    return isomorphic_dompurify_1.default.sanitize(str, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [] // No attributes allowed
    });
}
/**
 * Content Security Policy headers
 */
function cspHeaders(req, res, next) {
    res.setHeader('Content-Security-Policy', "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline' https://unpkg.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
}
//# sourceMappingURL=security.js.map