"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authGuard_1 = require("../middleware/authGuard");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
// Enforce: only authenticated admins can access analytics
router.use(authGuard_1.authGuard, adminOnly_1.adminOnly);
// GET /api/analytics/summary - Get overall issue statistics
router.get("/summary", async (_req, res, next) => {
    try {
        const [totalIssues, byStatus, byType] = await Promise.all([
            // Total count
            prisma_1.prisma.issue.count(),
            // Count by status
            prisma_1.prisma.issue.groupBy({
                by: ['status'],
                _count: { id: true }
            }),
            // Count by type
            prisma_1.prisma.issue.groupBy({
                by: ['type'],
                _count: { id: true }
            })
        ]);
        const statusCounts = byStatus.reduce((acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
        }, {});
        const typeCounts = byType.reduce((acc, item) => {
            acc[item.type] = item._count.id;
            return acc;
        }, {});
        res.json({
            totalIssues,
            byStatus: statusCounts,
            byType: typeCounts
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/analytics/trends - Get issues over time (last 30 days)
router.get("/trends", async (_req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const issues = await prisma_1.prisma.issue.findMany({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo
                }
            },
            select: {
                createdAt: true,
                status: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        // Group by date
        const dailyCounts = {};
        issues.forEach((issue) => {
            const dateStr = issue.createdAt.toISOString().split('T')[0];
            if (!dailyCounts[dateStr]) {
                dailyCounts[dateStr] = { date: dateStr, new: 0, resolved: 0 };
            }
            dailyCounts[dateStr].new += 1;
        });
        // Get resolved issues count by resolution date
        const resolvedIssues = await prisma_1.prisma.issue.findMany({
            where: {
                status: 'resolved',
                updatedAt: {
                    gte: thirtyDaysAgo
                }
            },
            select: {
                updatedAt: true
            }
        });
        resolvedIssues.forEach((issue) => {
            const dateStr = issue.updatedAt.toISOString().split('T')[0];
            if (!dailyCounts[dateStr]) {
                dailyCounts[dateStr] = { date: dateStr, new: 0, resolved: 0 };
            }
            dailyCounts[dateStr].resolved += 1;
        });
        // Sort by date and convert to array
        const trends = Object.values(dailyCounts).sort((a, b) => a.date.localeCompare(b.date));
        res.json({ trends });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/analytics/areas - Get issues by geographic area
router.get("/areas", async (_req, res, next) => {
    try {
        // Get all issues with location
        const issues = await prisma_1.prisma.issue.findMany({
            select: {
                lat: true,
                lon: true,
                status: true
            }
        });
        // For now, we'll create a simple grid-based area analysis
        // In a real implementation, this would use PostGIS for proper geospatial queries
        const gridSize = 0.01; // Approximately 1km
        const areas = {};
        issues.forEach((issue) => {
            const gridLat = Math.floor(issue.lat / gridSize) * gridSize;
            const gridLng = Math.floor(issue.lon / gridSize) * gridSize;
            const key = `${gridLat.toFixed(3)},${gridLng.toFixed(3)}`;
            if (!areas[key]) {
                areas[key] = { lat: gridLat, lng: gridLng, count: 0, resolved: 0 };
            }
            areas[key].count += 1;
            if (issue.status === 'resolved') {
                areas[key].resolved += 1;
            }
        });
        const areaList = Object.values(areas).sort((a, b) => b.count - a.count);
        res.json({ areas: areaList.slice(0, 50) }); // Return top 50 areas
    }
    catch (error) {
        next(error);
    }
});
// GET /api/analytics/response-time - Get average resolution time
router.get("/response-time", async (_req, res, next) => {
    try {
        const resolvedIssues = await prisma_1.prisma.issue.findMany({
            where: {
                status: 'resolved'
            },
            select: {
                createdAt: true,
                updatedAt: true
            }
        });
        if (resolvedIssues.length === 0) {
            res.json({
                averageHours: 0,
                averageDays: 0,
                totalResolved: 0,
                fastestHours: 0,
                slowestHours: 0
            });
            return;
        }
        const resolutionTimes = resolvedIssues.map((issue) => {
            const createdAt = new Date(issue.createdAt).getTime();
            const updatedAt = new Date(issue.updatedAt).getTime();
            return (updatedAt - createdAt) / (1000 * 60 * 60); // Hours
        });
        const averageHours = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        const fastestHours = Math.min(...resolutionTimes);
        const slowestHours = Math.max(...resolutionTimes);
        res.json({
            averageHours: Math.round(averageHours * 10) / 10,
            averageDays: Math.round((averageHours / 24) * 10) / 10,
            totalResolved: resolvedIssues.length,
            fastestHours: Math.round(fastestHours * 10) / 10,
            slowestHours: Math.round(slowestHours * 10) / 10
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/analytics/top-reporters - Get users with most reports (admin only)
router.get("/top-reporters", async (_req, res, next) => {
    try {
        const topReporters = await prisma_1.prisma.issue.groupBy({
            by: ['reporterId'],
            _count: { id: true },
            orderBy: {
                _count: { id: 'desc' }
            },
            take: 10
        });
        // Get user details for top reporters
        const userIds = topReporters.map((r) => r.reporterId);
        const users = await prisma_1.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true }
        });
        const userMap = users.reduce((acc, user) => {
            acc[user.id] = user.email;
            return acc;
        }, {});
        const reporters = topReporters.map((r) => ({
            userId: r.reporterId,
            email: userMap[r.reporterId] || 'Unknown',
            issueCount: r._count.id
        }));
        res.json({ reporters });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map