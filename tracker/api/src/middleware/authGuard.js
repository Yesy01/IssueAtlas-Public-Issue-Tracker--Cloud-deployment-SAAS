"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
const auth_1 = require("../lib/auth");
function authGuard(req, res, next) {
    const header = req.headers["authorization"];
    if (!header || typeof header !== "string") {
        return res
            .status(401)
            .json({ error: "Missing Authorization header (expected Bearer token)" });
    }
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res
            .status(401)
            .json({ error: "Invalid Authorization header format" });
    }
    try {
        const payload = (0, auth_1.verifyAccessToken)(token);
        req.user = { id: payload.userId, role: payload.role, email: payload.email };
        return next();
    }
    catch (err) {
        console.error("[authGuard] Token verification failed:", err);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
//# sourceMappingURL=authGuard.js.map