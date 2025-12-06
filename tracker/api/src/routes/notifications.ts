import { Router, Request, Response, NextFunction } from "express";
import { authGuard } from "../middleware/authGuard.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../lib/notifications.js";

const router = Router();

// All notification routes require authentication
router.use(authGuard);

// GET /api/notifications - Get user's notifications
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === "true";

    const { notifications, total } = await getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
    });

    res.json({
      notifications,
      total,
      limit,
      offset,
      hasMore: offset + notifications.length < total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const count = await getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/:id/read - Mark single notification as read
router.post("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id;

    await markAsRead(notificationId, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post("/read-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await markAllAsRead(userId);
    res.json({ success: true, count: result.count });
  } catch (error) {
    next(error);
  }
});

export default router;
