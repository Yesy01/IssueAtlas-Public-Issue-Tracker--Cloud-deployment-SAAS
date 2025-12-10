"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../lib/logger");
function errorHandler(err, req, res, _next) {
    // Log error with full details
    logger_1.logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        ip: req.ip
    });
    if (res.headersSent) {
        return;
    }
    // Return generic error to client (don't expose internal details)
    return res.status(err.status || 500).json({
        error: err.message || "Internal server error",
    });
}
//# sourceMappingURL=error.js.map