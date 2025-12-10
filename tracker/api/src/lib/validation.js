"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentCreateSchema = exports.IssueStatusUpdateSchema = exports.IssueUpdateSchema = exports.IssueCreateSchema = exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email().min(3).max(255),
    password: zod_1.z.string().min(8).max(128),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email().min(3).max(255),
    password: zod_1.z.string().min(1).max(128),
});
exports.IssueCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(120),
    description: zod_1.z.string().min(10).max(3000),
    type: zod_1.z.enum(["pothole", "streetlight", "drainage", "other"]),
    lat: zod_1.z.number().min(-90).max(90),
    lon: zod_1.z.number().min(-180).max(180),
    address: zod_1.z.string().max(255).optional(),
    areaName: zod_1.z.string().max(255).optional(),
    imageUrl: zod_1.z.string().url().optional(),
});
exports.IssueUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(120).optional(),
    description: zod_1.z.string().min(10).max(3000).optional(),
    type: zod_1.z.enum(["pothole", "streetlight", "drainage", "other"]).optional(),
    address: zod_1.z.string().max(255).optional(),
    areaName: zod_1.z.string().max(255).optional(),
});
exports.IssueStatusUpdateSchema = zod_1.z.object({
    newStatus: zod_1.z.enum(["new", "triaged", "in_progress", "resolved"]),
});
exports.CommentCreateSchema = zod_1.z.object({
    body: zod_1.z.string().min(3, "Comment is too short").max(1000, "Comment is too long"),
});
//# sourceMappingURL=validation.js.map