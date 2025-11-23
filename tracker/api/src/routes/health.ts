// src/routes/health.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/health  (when mounted under /api/health)
router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /api/health/db
router.get("/db", async (_req, res) => {
  try {
    // Simple DB ping
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "up" });
  } catch (err) {
    console.error("[health/db] DB check failed:", err);
    res.status(500).json({ status: "error", db: "down" });
  }
});

export default router;
