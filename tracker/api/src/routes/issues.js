"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const validation_1 = require("../lib/validation");
const authGuard_1 = require("../middleware/authGuard");
const adminOnly_1 = require("../middleware/adminOnly");
const notifications_1 = require("../lib/notifications");
const postgis_1 = require("../lib/postgis");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const OfficialResponseSchema = zod_1.z.object({
    officialResponse: zod_1.z
        .string()
        .min(5, "Response should be at least 5 characters"),
});
const FlagIssueSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
const VerifyIssueSchema = zod_1.z.object({});
/**
 * POST /api/issues
 * Auth: required (any logged-in user or guest)
 */
router.post("/", authGuard_1.authGuard, async (req, res) => {
    const parseResult = validation_1.IssueCreateSchema.safeParse(req.body);
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
        // For guest users, use a placeholder reporter or null
        // Guest IDs start with "guest_" and aren't in the database
        const isGuest = req.user.id.startsWith("guest_");
        let reporterId;
        if (isGuest) {
            // Find or create a special "guest" user for anonymous submissions
            let guestUser = await prisma.user.findFirst({
                where: { email: "guest@system.local" },
            });
            if (!guestUser) {
                // Create a system guest user if it doesn't exist
                guestUser = await prisma.user.create({
                    data: {
                        email: "guest@system.local",
                        password: "", // No password for system user
                        role: "user",
                    },
                });
            }
            reporterId = guestUser.id;
        }
        else {
            reporterId = req.user.id;
        }
        const issue = await prisma.issue.create({
            data: {
                reporterId,
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
        if (Number.isFinite(data.lat) && Number.isFinite(data.lon)) {
            await (0, postgis_1.updateIssueLocation)(issue.id, data.lat, data.lon);
        }
        return res.status(201).json({ issue });
    }
    catch (err) {
        console.error("[POST /api/issues] error:", err);
        return res.status(500).json({ error: "Failed to create issue" });
    }
});
/**
 * GET /api/issues
 * Public: list issues with optional filters and pagination
 *
 * Query params:
 *  - status: new|triaged|in_progress|resolved
 *  - type: pothole|streetlight|drainage|other
 *  - bbox: "minLon,minLat,maxLon,maxLat"
 *  - search: free text in title/description
 *  - page: page number (default: 1)
 *  - limit: items per page (default: 20, max: 100)
 */
router.get("/", async (req, res) => {
    const { status, type, bbox, search } = req.query;
    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const where = {};
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
        const [issues, total] = await Promise.all([
            prisma.issue.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    _count: {
                        select: {
                            comments: true,
                            upvotes: true,
                        },
                    },
                },
            }),
            prisma.issue.count({ where }),
        ]);
        return res.json({
            items: issues,
            count: issues.length,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        console.error("[GET /api/issues] error:", err);
        return res.status(500).json({ error: "Failed to list issues" });
    }
});
/**
 * GET /api/issues/nearby
 * Query params: lat, lon, radius (meters, optional, default 5000)
 * Public
 */
router.get("/nearby", async (req, res) => {
    const { lat, lon, radius } = req.query;
    if (typeof lat !== "string" || typeof lon !== "string") {
        return res.status(400).json({ error: "lat and lon are required" });
    }
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
        return res.status(400).json({ error: "lat and lon must be numbers" });
    }
    const radiusMeters = typeof radius === "string" && Number.isFinite(parseFloat(radius))
        ? parseFloat(radius)
        : 5000;
    try {
        const issues = (await (0, postgis_1.findIssuesWithinRadius)(latNum, lonNum, radiusMeters));
        return res.json({ items: issues, count: issues.length });
    }
    catch (err) {
        console.error("[GET /api/issues/nearby] error:", err);
        return res.status(500).json({ error: "Failed to query nearby issues" });
    }
});
/**
 * GET /api/issues/:id
 * Public: fetch single issue + basic history
 */
router.get("/:id", async (req, res) => {
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
    }
    catch (err) {
        console.error("[GET /api/issues/:id] error:", err);
        return res.status(500).json({ error: "Failed to fetch issue" });
    }
});
/**
 * PUT /api/issues/:id
 * Auth: required (owner only)
 * Update issue details (not status - that's admin only via PATCH)
 */
router.put("/:id", authGuard_1.authGuard, async (req, res) => {
    const { id } = req.params;
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    const parseResult = validation_1.IssueUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid request body",
            details: parseResult.error.flatten(),
        });
    }
    try {
        const existing = await prisma.issue.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({ error: "Issue not found" });
        }
        // Check ownership - only the reporter can edit their own issue
        // Admins can also edit any issue
        if (existing.reporterId !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ error: "Not authorized to edit this issue" });
        }
        const data = parseResult.data;
        const updated = await prisma.issue.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description && { description: data.description }),
                ...(data.type && { type: data.type }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.areaName !== undefined && { areaName: data.areaName }),
            },
            include: {
                reporter: {
                    select: { id: true, email: true, role: true },
                },
            },
        });
        return res.json({ issue: updated });
    }
    catch (err) {
        console.error("[PUT /api/issues/:id] error:", err);
        return res.status(500).json({ error: "Failed to update issue" });
    }
});
/**
 * PATCH /api/issues/:id/status
 * Auth: admin only
 */
router.patch("/:id/status", authGuard_1.authGuard, adminOnly_1.adminOnly, async (req, res) => {
    const { id } = req.params;
    const parseResult = validation_1.IssueStatusUpdateSchema.safeParse(req.body);
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
            include: {
                reporter: true,
                upvotes: {
                    select: { userId: true },
                },
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
        // Notify reporter and upvoters about the status change (excluding the actor)
        try {
            const watcherIds = new Set();
            if (updated.reporterId) {
                watcherIds.add(updated.reporterId);
            }
            for (const up of updated.upvotes) {
                watcherIds.add(up.userId);
            }
            watcherIds.delete(req.user.id);
            const message = `Status of "${updated.title}" changed to ${newStatus}.`;
            const data = Array.from(watcherIds).map((userId) => ({
                userId,
                issueId: updated.id,
                type: client_1.NotificationType.STATUS_CHANGE,
                message,
            }));
            if (data.length > 0) {
                await prisma.notification.createMany({ data });
            }
        }
        catch (notifyErr) {
            console.error("[PATCH /api/issues/:id/status] notification error:", notifyErr);
            // Don't fail the request if notification fails
        }
        return res.json({ issue: updated });
    }
    catch (err) {
        console.error("[PATCH /api/issues/:id/status] error:", err);
        return res.status(500).json({ error: "Failed to update status" });
    }
});
// PATCH /api/issues/:id/official-response
router.patch("/:id/official-response", authGuard_1.authGuard, adminOnly_1.adminOnly, async (req, res) => {
    const { id: issueId } = req.params;
    const parsed = OfficialResponseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid payload",
            details: parsed.error.flatten(),
        });
    }
    const { officialResponse } = parsed.data;
    try {
        const issue = await prisma.issue.update({
            where: { id: issueId },
            data: {
                officialResponse,
                officialRespondedAt: new Date(),
            },
        });
        return res.json({ issue });
    }
    catch (err) {
        console.error("[PATCH /api/issues/:id/official-response] error:", err);
        return res.status(500).json({ error: "Failed to save official response" });
    }
});
// POST /api/issues/:id/verify
router.post("/:id/verify", authGuard_1.authGuard, adminOnly_1.adminOnly, async (req, res) => {
    const { id } = req.params;
    const parsed = VerifyIssueSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid payload",
            details: parsed.error.flatten(),
        });
    }
    try {
        const issue = await prisma.issue.update({
            where: { id },
            data: {
                verified: true,
                verifiedAt: new Date(),
                verifiedById: req.user.id,
            },
        });
        return res.json({ issue });
    }
    catch (err) {
        console.error("[POST /api/issues/:id/verify] error:", err);
        return res.status(500).json({ error: "Failed to verify issue" });
    }
});
// POST /api/issues/:id/flag
router.post("/:id/flag", authGuard_1.authGuard, async (req, res) => {
    const { id } = req.params;
    const parsed = FlagIssueSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid flag payload",
            details: parsed.error.flatten(),
        });
    }
    const { reason } = parsed.data;
    try {
        const issue = await prisma.issue.update({
            where: { id },
            data: {
                flagged: true,
                flaggedReason: reason && reason.trim().length ? reason.trim() : null,
            },
        });
        return res.json({ issue });
    }
    catch (err) {
        console.error("[POST /api/issues/:id/flag] error:", err);
        return res.status(500).json({ error: "Failed to flag issue" });
    }
});
/**
 * POST /api/issues/:id/upvote
 * Auth required
 * Idempotent: multiple calls from same user don't increase count
 */
router.post("/:id/upvote", authGuard_1.authGuard, async (req, res) => {
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
        // Notify the reporter on milestone upvotes
        try {
            await (0, notifications_1.notifyUpvote)(issueId, issue.reporterId, req.user.id, issue.title, upvoteCount);
        }
        catch (notifyErr) {
            console.error("[POST /api/issues/:id/upvote] notification error:", notifyErr);
        }
        return res.json({
            success: true,
            issueId,
            upvoteCount,
        });
    }
    catch (err) {
        console.error("[POST /api/issues/:id/upvote] error:", err);
        return res.status(500).json({ error: "Failed to upvote issue" });
    }
});
/**
 * POST /api/issues/:id/comments
 * Auth required
 */
router.post("/:id/comments", authGuard_1.authGuard, async (req, res) => {
    const { id: issueId } = req.params;
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    const parsed = validation_1.CommentCreateSchema.safeParse(req.body);
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
        // Notify the issue reporter about the new comment
        try {
            const commenterEmail = comment.user.email || "Unknown user";
            await (0, notifications_1.notifyNewComment)(issueId, issue.reporterId, req.user.id, commenterEmail, issue.title);
        }
        catch (notifyErr) {
            console.error("[POST /api/issues/:id/comments] notification error:", notifyErr);
        }
        return res.status(201).json({ comment });
    }
    catch (err) {
        console.error("[POST /api/issues/:id/comments] error:", err);
        return res.status(500).json({ error: "Failed to create comment" });
    }
});
/**
 * GET /api/issues/:id/comments
 * Public: list comments for an issue
 */
router.get("/:id/comments", async (req, res) => {
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
    }
    catch (err) {
        console.error("[GET /api/issues/:id/comments] error:", err);
        return res.status(500).json({ error: "Failed to list comments" });
    }
});
exports.default = router;
//# sourceMappingURL=issues.js.map