import { NotificationType } from "@prisma/client";
import { prisma } from "./prisma";

interface CreateNotificationParams {
  userId: string;
  issueId: string;
  type: NotificationType;
  message: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, issueId, type, message } = params;
  
  return prisma.notification.create({
    data: {
      userId,
      issueId,
      type,
      message,
    },
  });
}

/**
 * Notify the issue reporter when status changes
 */
export async function notifyStatusChange(
  issueId: string,
  reporterId: string,
  oldStatus: string | null,
  newStatus: string,
  issueTitle: string
) {
  const statusLabels: Record<string, string> = {
    new: "New",
    triaged: "Triaged",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  const message = oldStatus
    ? `Your issue "${issueTitle}" has been updated from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}.`
    : `Your issue "${issueTitle}" status is now ${statusLabels[newStatus] || newStatus}.`;

  return createNotification({
    userId: reporterId,
    issueId,
    type: NotificationType.STATUS_CHANGE,
    message,
  });
}

/**
 * Notify the issue reporter when someone comments
 */
export async function notifyNewComment(
  issueId: string,
  reporterId: string,
  commenterId: string,
  commenterEmail: string,
  issueTitle: string
) {
  // Don't notify if the reporter is commenting on their own issue
  if (reporterId === commenterId) {
    return null;
  }

  return createNotification({
    userId: reporterId,
    issueId,
    type: NotificationType.COMMENT,
    message: `${commenterEmail} commented on your issue "${issueTitle}".`,
  });
}

/**
 * Notify the issue reporter when someone upvotes
 */
export async function notifyUpvote(
  issueId: string,
  reporterId: string,
  upvoterId: string,
  issueTitle: string,
  totalUpvotes: number
) {
  // Don't notify if the reporter upvotes their own issue
  if (reporterId === upvoterId) {
    return null;
  }

  // Only notify on milestone upvotes (1, 5, 10, 25, 50, 100, etc.)
  const milestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  if (!milestones.includes(totalUpvotes)) {
    return null;
  }

  return createNotification({
    userId: reporterId,
    issueId,
    type: NotificationType.STATUS_CHANGE,
    message: `Your issue "${issueTitle}" has reached ${totalUpvotes} upvote${totalUpvotes > 1 ? 's' : ''}!`,
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const where = {
    userId,
    ...(unreadOnly ? { read: false } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        issue: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      read: true,
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}
