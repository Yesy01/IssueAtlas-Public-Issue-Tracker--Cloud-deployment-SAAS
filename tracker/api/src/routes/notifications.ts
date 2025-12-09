import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/authGuard";

const router = Router();

// All notification routes require authentication
router.use(authGuard);

// GET /api/notifications - Get current user's notifications (capped to 100)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
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
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/:id/read - Mark single notification as read
router.post("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = req.params.id;

    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId: req.user!.id },
      data: { read: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post("/read-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
