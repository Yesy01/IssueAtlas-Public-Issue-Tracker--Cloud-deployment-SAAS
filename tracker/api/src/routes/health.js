"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/health.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/health  (when mounted under /api/health)
router.get("/", (_req, res) => {
    res.json({ status: "ok" });
});
// GET /api/health/db
router.get("/db", async (_req, res) => {
    try {
        // Simple DB ping
        await prisma.$queryRaw `SELECT 1`;
        res.json({ status: "ok", db: "up" });
    }
    catch (err) {
        console.error("[health/db] DB check failed:", err);
        res.status(500).json({ status: "error", db: "down" });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map