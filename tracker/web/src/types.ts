// src/types.ts

export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type IssueStatus = "new" | "triaged" | "in_progress" | "resolved";
export type IssueType = "pothole" | "streetlight" | "drainage" | "other";

export interface StatusHistoryEntry {
  id: string;
  issueId: string;
  oldStatus: IssueStatus;
  newStatus: IssueStatus;
  changedBy: string;
  changedAt: string;
}

export interface Issue {
  id: string;
  reporterId: string;
  reporter?: Pick<User, "id" | "email" | "role">;
  title: string;
  description: string;
  status: IssueStatus;
  type: IssueType;
  lat: number;
  lon: number;
  imageUrl?: string | null;
  address?: string | null;
  areaName?: string | null;
  createdAt: string;
  updatedAt: string;
  history?: StatusHistoryEntry[];
  _count?: {
    comments: number;
    upvotes: number;
  };
}

export interface IssueWithStats extends Issue {
  stats?: {
    commentCount: number;
    upvoteCount: number;
  };
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  user: Pick<User, "id" | "email" | "role">;
  body: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// API Response types
export interface IssueListResponse {
  items: Issue[];
  count: number;
  pagination?: PaginationMeta;
}

export interface IssueDetailResponse {
  issue: Issue;
  stats: {
    commentCount: number;
    upvoteCount: number;
  };
}

export interface CommentListResponse {
  items: Comment[];
  count: number;
}

export interface UpvoteResponse {
  success: boolean;
  issueId: string;
  upvoteCount: number;
}
