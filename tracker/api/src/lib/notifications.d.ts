import { NotificationType } from "@prisma/client";
interface CreateNotificationParams {
    userId: string;
    issueId: string;
    type: NotificationType;
    message: string;
}
/**
 * Create a notification for a user
 */
export declare function createNotification(params: CreateNotificationParams): Promise<{
    id: string;
    userId: string;
    issueId: string;
    type: import(".prisma/client").$Enums.NotificationType;
    message: string;
    read: boolean;
    createdAt: Date;
}>;
/**
 * Notify the issue reporter when status changes
 */
export declare function notifyStatusChange(issueId: string, reporterId: string, oldStatus: string | null, newStatus: string, issueTitle: string): Promise<{
    id: string;
    userId: string;
    issueId: string;
    type: import(".prisma/client").$Enums.NotificationType;
    message: string;
    read: boolean;
    createdAt: Date;
}>;
/**
 * Notify the issue reporter when someone comments
 */
export declare function notifyNewComment(issueId: string, reporterId: string, commenterId: string, commenterEmail: string, issueTitle: string): Promise<{
    id: string;
    userId: string;
    issueId: string;
    type: import(".prisma/client").$Enums.NotificationType;
    message: string;
    read: boolean;
    createdAt: Date;
} | null>;
/**
 * Notify the issue reporter when someone upvotes
 */
export declare function notifyUpvote(issueId: string, reporterId: string, upvoterId: string, issueTitle: string, totalUpvotes: number): Promise<{
    id: string;
    userId: string;
    issueId: string;
    type: import(".prisma/client").$Enums.NotificationType;
    message: string;
    read: boolean;
    createdAt: Date;
} | null>;
/**
 * Get unread notification count for a user
 */
export declare function getUnreadCount(userId: string): Promise<number>;
/**
 * Get notifications for a user
 */
export declare function getUserNotifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
}): Promise<{
    notifications: ({
        issue: {
            id: string;
            title: string;
            status: import(".prisma/client").$Enums.IssueStatus;
        };
    } & {
        id: string;
        userId: string;
        issueId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        message: string;
        read: boolean;
        createdAt: Date;
    })[];
    total: number;
}>;
/**
 * Mark a notification as read
 */
export declare function markAsRead(notificationId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
/**
 * Mark all notifications as read for a user
 */
export declare function markAllAsRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
export {};
//# sourceMappingURL=notifications.d.ts.map