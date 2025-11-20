import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  IssueCreateSchema,
  IssueStatusUpdateSchema,
} from "../lib/validation";
import { authGuard } from "../middleware/authGuard";
import { adminOnly } from "../middleware/adminOnly";

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /api/issues
 * Auth: required (any logged-in user)
 */
router.post("/", authGuard, async (req: Request, res: Response) => {
  const parseResult = IssueCreateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.flatten(),
    });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const data = parseResult.data;

  try {
    const issue = await prisma.issue.create({
      data: {
        reporterId: req.user.id,
        title: data.title,
        description: data.description,
        type: data.type,
        lat: data.lat,
        lon: data.lon,
        address: data.address,
        areaName: data.areaName,
        imageUrl: data.imageUrl,
        // status defaults to "new" via Prisma schema
      },
    });

    return res.status(201).json({ issue });
  } catch (err) {
    console.error("[POST /api/issues] error:", err);
    return res.status(500).json({ error: "Failed to create issue" });
  }
});

/**
 * GET /api/issues
 * Public: list issues with optional filters
 *
 * Query params:
 *  - status: new|triaged|in_progress|resolved
 *  - type: pothole|streetlight|drainage|other
 *  - bbox: "minLon,minLat,maxLon,maxLat"
 *  - search: free text in title/description
 */
router.get("/", async (req: Request, res: Response) => {
  const { status, type, bbox, search } = req.query;

  const where: any = {};

  if (typeof status === "string") {
    where.status = status;
  }

  if (typeof type === "string") {
    where.type = type;
  }

  if (typeof search === "string" && search.trim().length > 0) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // bbox: minLon,minLat,maxLon,maxLat
  if (typeof bbox === "string") {
    const parts = bbox.split(",").map((p) => parseFloat(p.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLon, minLat, maxLon, maxLat] = parts;
      where.AND = [
        { lat: { gte: minLat } },
        { lat: { lte: maxLat } },
        { lon: { gte: minLon } },
        { lon: { lte: maxLon } },
      ];
    }
  }

  try {
    const issues = await prisma.issue.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({ items: issues, count: issues.length });
  } catch (err) {
    console.error("[GET /api/issues] error:", err);
    return res.status(500).json({ error: "Failed to list issues" });
  }
});

/**
 * GET /api/issues/:id
 * Public: fetch single issue + basic history
 */
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, email: true, role: true },
        },
        history: {
          orderBy: { changedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    // Simple extra stats: counts of comments & upvotes
    const [commentCount, upvoteCount] = await Promise.all([
      prisma.comment.count({ where: { issueId: id } }),
      prisma.issueUpvote.count({ where: { issueId: id } }),
    ]);

    return res.json({
      issue,
      stats: {
        commentCount,
        upvoteCount,
      },
    });
  } catch (err) {
    console.error("[GET /api/issues/:id] error:", err);
    return res.status(500).json({ error: "Failed to fetch issue" });
  }
});

/**
 * PATCH /api/issues/:id/status
 * Auth: admin only
 */
router.patch(
  "/:id/status",
  authGuard,
  adminOnly,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const parseResult = IssueStatusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { newStatus } = parseResult.data;

    try {
      const existing = await prisma.issue.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: "Issue not found" });
      }

      const updated = await prisma.issue.update({
        where: { id },
        data: {
          status: newStatus,
        },
      });

      await prisma.statusHistory.create({
        data: {
          issueId: id,
          oldStatus: existing.status,
          newStatus,
          changedBy: req.user.id,
        },
      });

      return res.json({ issue: updated });
    } catch (err) {
      console.error("[PATCH /api/issues/:id/status] error:", err);
      return res.status(500).json({ error: "Failed to update status" });
    }
  }
);


/**
 * POST /api/issues/:id/upvote
 * Auth required
 * Idempotent: multiple calls from same user don't increase count
 */
router.post("/:id/upvote", authGuard, async (req: Request, res: Response) => {
  const { id: issueId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Ensure issue exists for nice 404s
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    // Idempotent upvote based on composite PK (issueId, userId)
    await prisma.issueUpvote.upsert({
      where: {
        issueId_userId: {
          issueId,
          userId: req.user.id,
        },
      },
      update: {}, // do nothing if exists
      create: {
        issueId,
        userId: req.user.id,
      },
    });

    const upvoteCount = await prisma.issueUpvote.count({
      where: { issueId },
    });

    return res.json({
      success: true,
      issueId,
      upvoteCount,
    });
  } catch (err) {
    console.error("[POST /api/issues/:id/upvote] error:", err);
    return res.status(500).json({ error: "Failed to upvote issue" });
  }
});

import { CommentCreateSchema } from "../lib/validation"; // if not imported yet

/**
 * POST /api/issues/:id/comments
 * Auth required
 */
router.post("/:id/comments", authGuard, async (req: Request, res: Response) => {
  const { id: issueId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const parsed = CommentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        issueId,
        userId: req.user.id,
        body: parsed.data.body,
      },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    return res.status(201).json({ comment });
  } catch (err) {
    console.error("[POST /api/issues/:id/comments] error:", err);
    return res.status(500).json({ error: "Failed to create comment" });
  }
});

/**
 * GET /api/issues/:id/comments
 * Public: list comments for an issue
 */
router.get("/:id/comments", async (req: Request, res: Response) => {
  const { id: issueId } = req.params;

  try {
    const comments = await prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    return res.json({ items: comments, count: comments.length });
  } catch (err) {
    console.error("[GET /api/issues/:id/comments] error:", err);
    return res.status(500).json({ error: "Failed to list comments" });
  }
});

export default router;
