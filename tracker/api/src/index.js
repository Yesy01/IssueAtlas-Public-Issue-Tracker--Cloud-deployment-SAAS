"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("./routes/auth"));
const issues_1 = __importDefault(require("./routes/issues"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const error_1 = require("./middleware/error");
const uploads_1 = __importDefault(require("./routes/uploads"));
const prisma_1 = require("./lib/prisma");
const health_1 = __importDefault(require("./routes/health"));
const images_1 = __importDefault(require("./routes/images"));
const rateLimit_1 = require("./middleware/rateLimit");
const security_1 = require("./middleware/security");
const logger_1 = require("./lib/logger");
const requestLogger_1 = require("./middleware/requestLogger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Security headers with helmet
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // We'll use custom CSP
    crossOriginEmbedderPolicy: false // Allow external resources
}));
// Custom security headers
app.use(security_1.cspHeaders);
// XSS protection middleware
app.use(security_1.xssProtection);
// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000']; // Default for development
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Request logging
if (process.env.NODE_ENV === 'production') {
    app.use((0, morgan_1.default)('combined', { stream: logger_1.morganStream }));
}
else {
    app.use((0, morgan_1.default)('dev'));
}
app.use(requestLogger_1.requestLogger);
// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.get('/api/health/db', async (req, res) => {
    try {
        // Minimal DB probe
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', db: 'up' });
    }
    catch (err) {
        console.error('[health/db] DB check failed:', err);
        res.status(500).json({ status: 'error', db: 'down' });
    }
});
// API routes
app.use("/api/auth", rateLimit_1.authLimiter, auth_1.default); // brute-force protection on auth
app.use("/api/uploads", rateLimit_1.uploadLimiter, uploads_1.default);
app.use("/api", rateLimit_1.generalLimiter); // general limiter for everything else
app.use("/api/issues", issues_1.default);
app.use("/api/health", health_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/images", images_1.default);
// 404 handler (for API only)
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        path: req.path,
    });
});
// Central error handler
app.use(error_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`API server started on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    });
});
//# sourceMappingURL=index.js.map