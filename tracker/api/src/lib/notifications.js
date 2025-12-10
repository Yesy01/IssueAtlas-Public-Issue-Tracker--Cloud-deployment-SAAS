"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyStatusChange = notifyStatusChange;
exports.notifyNewComment = notifyNewComment;
exports.notifyUpvote = notifyUpvote;
exports.getUnreadCount = getUnreadCount;
exports.getUserNotifications = getUserNotifications;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
const client_1 = require("@prisma/client");
const prisma_1 = require("./prisma");
/**
 * Create a notification for a user
 */
async function createNotification(params) {
    const { userId, issueId, type, message } = params;
    return prisma_1.prisma.notification.create({
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
async function notifyStatusChange(issueId, reporterId, oldStatus, newStatus, issueTitle) {
    const statusLabels = {
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
        type: client_1.NotificationType.STATUS_CHANGE,
        message,
    });
}
/**
 * Notify the issue reporter when someone comments
 */
async function notifyNewComment(issueId, reporterId, commenterId, commenterEmail, issueTitle) {
    // Don't notify if the reporter is commenting on their own issue
    if (reporterId === commenterId) {
        return null;
    }
    return createNotification({
        userId: reporterId,
        issueId,
        type: client_1.NotificationType.COMMENT,
        message: `${commenterEmail} commented on your issue "${issueTitle}".`,
    });
}
/**
 * Notify the issue reporter when someone upvotes
 */
async function notifyUpvote(issueId, reporterId, upvoterId, issueTitle, totalUpvotes) {
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
        type: client_1.NotificationType.STATUS_CHANGE,
        message: `Your issue "${issueTitle}" has reached ${totalUpvotes} upvote${totalUpvotes > 1 ? 's' : ''}!`,
    });
}
/**
 * Get unread notification count for a user
 */
async function getUnreadCount(userId) {
    return prisma_1.prisma.notification.count({
        where: {
            userId,
            read: false,
        },
    });
}
/**
 * Get notifications for a user
 */
async function getUserNotifications(userId, options = {}) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;
    const where = {
        userId,
        ...(unreadOnly ? { read: false } : {}),
    };
    const [notifications, total] = await Promise.all([
        prisma_1.prisma.notification.findMany({
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
        prisma_1.prisma.notification.count({ where }),
    ]);
    return { notifications, total };
}
/**
 * Mark a notification as read
 */
async function markAsRead(notificationId, userId) {
    return prisma_1.prisma.notification.updateMany({
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
async function markAllAsRead(userId) {
    return prisma_1.prisma.notification.updateMany({
        where: {
            userId,
            read: false,
        },
        data: {
            read: true,
        },
    });
}
//# sourceMappingURL=notifications.js.map