"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authGuard_1 = require("../middleware/authGuard");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(authGuard_1.authGuard);
// GET /api/notifications - Get current user's notifications (capped to 100)
router.get("/", async (req, res, next) => {
    try {
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
                issue: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
        });
        res.json({ items: notifications });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", async (req, res, next) => {
    try {
        const count = await prisma_1.prisma.notification.count({
            where: { userId: req.user.id, read: false },
        });
        res.json({ count });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/notifications/:id/read - Mark single notification as read
router.post("/:id/read", async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        const result = await prisma_1.prisma.notification.updateMany({
            where: { id: notificationId, userId: req.user.id },
            data: { read: true },
        });
        if (result.count === 0) {
            return res.status(404).json({ error: "Notification not found" });
        }
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/notifications/read-all - Mark all notifications as read
router.post("/read-all", async (req, res, next) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map