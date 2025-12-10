"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const logger_1 = require("../lib/logger");
/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    // Log request
    logger_1.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    // Capture the original end function
    const originalEnd = res.end;
    // Override res.end to log response
    res.end = function (chunk, encoding, callback) {
        const duration = Date.now() - startTime;
        logger_1.logger.info('Request completed', {
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
//# sourceMappingURL=requestLogger.js.map