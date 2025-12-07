import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(1).max(128),
});

export const IssueCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(3000),
  type: z.enum(["pothole", "streetlight", "drainage", "other"]),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  address: z.string().max(255).optional(),
  areaName: z.string().max(255).optional(),
  imageUrl: z.string().url().optional(),
});

export const IssueUpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(3000).optional(),
  type: z.enum(["pothole", "streetlight", "drainage", "other"]).optional(),
  address: z.string().max(255).optional(),
  areaName: z.string().max(255).optional(),
});

export const IssueStatusUpdateSchema = z.object({
  newStatus: z.enum(["new", "triaged", "in_progress", "resolved"]),
});

export type IssueStatusUpdateInput = z.infer<typeof IssueStatusUpdateSchema>;
export const CommentCreateSchema = z.object({
  body: z.string().min(3, "Comment is too short").max(1000, "Comment is too long"),
});

export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type IssueCreateInput = z.infer<typeof IssueCreateSchema>;
export type IssueUpdateInput = z.infer<typeof IssueUpdateSchema>;
