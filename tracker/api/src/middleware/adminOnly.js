"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = adminOnly;
function adminOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }
    return next();
}
//# sourceMappingURL=adminOnly.js.map