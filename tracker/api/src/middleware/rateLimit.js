"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictLimiter = exports.uploadLimiter = exports.authLimiter = exports.generalLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const rateLimitStore = new Map();
// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Cleanup every minute
function createRateLimiter(options) {
    const { windowMs, max, message = "Too many requests, please try again later", keyGenerator = (req) => req.ip || "unknown", } = options;
    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        let entry = rateLimitStore.get(key);
        if (!entry || now > entry.resetTime) {
            // Create new window
            entry = {
                count: 1,
                resetTime: now + windowMs,
            };
            rateLimitStore.set(key, entry);
        }
        else {
            entry.count++;
        }
        // Set rate limit headers
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
        res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));
        if (entry.count > max) {
            res.setHeader("Retry-After", Math.ceil((entry.resetTime - now) / 1000));
            return res.status(429).json({ error: message });
        }
        next();
    };
}
// Pre-configured limiters
exports.generalLimiter = createRateLimiter({
    windowMs: 10 * 1000, // 10 seconds
    max: 100, // 100 requests per 10 seconds
    message: "Too many requests, please try again later",
});
exports.authLimiter = createRateLimiter({
    windowMs: 5 * 1000, // 5 seconds
    max: 20, // 20 auth attempts per 5 seconds
    message: "Too many authentication attempts, please try again in a moment",
});
exports.uploadLimiter = createRateLimiter({
    windowMs: 10 * 1000, // 10 seconds
    max: 20, // 20 uploads per 10 seconds
    message: "Upload limit exceeded, please try again later",
});
exports.strictLimiter = createRateLimiter({
    windowMs: 5 * 1000, // 5 seconds
    max: 50, // 50 requests per 5 seconds
    message: "Too many requests, please slow down",
});
//# sourceMappingURL=rateLimit.js.map