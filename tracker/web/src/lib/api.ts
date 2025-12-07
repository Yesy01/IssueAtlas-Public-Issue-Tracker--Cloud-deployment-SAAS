// src/lib/api.ts
import axios from "axios";
import { getToken } from "./auth";
import type {
  Issue,
  IssueDetailResponse,
  CommentListResponse,
  Comment,
  UpvoteResponse,
  IssueListResponse,
} from "../types";

const baseURL = import.meta.env.VITE_API_BASE || "/api";

export const api = axios.create({
  baseURL,
});

// Attach token on each request if present
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== Issue API ====================

export async function getIssues(params?: {
  status?: string;
  type?: string;
  search?: string;
  bbox?: string;
  page?: number;
  limit?: number;
}): Promise<IssueListResponse> {
  const res = await api.get<IssueListResponse>("/issues", { params });
  return res.data;
}

export async function getIssue(id: string): Promise<IssueDetailResponse> {
  const res = await api.get<IssueDetailResponse>(`/issues/${id}`);
  return res.data;
}

export async function createIssue(data: {
  title: string;
  description: string;
  type: string;
  lat: number;
  lon: number;
  address?: string;
  areaName?: string;
  imageUrl?: string;
}): Promise<Issue> {
  const res = await api.post<{ issue: Issue }>("/issues", data);
  return res.data.issue;
}

export async function updateIssue(
  id: string,
  data: Partial<Pick<Issue, "title" | "description" | "type" | "address" | "areaName">>
): Promise<Issue> {
  const res = await api.put<{ issue: Issue }>(`/issues/${id}`, data);
  return res.data.issue;
}

// ==================== Comments API ====================

export async function getComments(issueId: string): Promise<Comment[]> {
  const res = await api.get<CommentListResponse>(`/issues/${issueId}/comments`);
  return res.data.items;
}

export async function createComment(issueId: string, body: string): Promise<Comment> {
  const res = await api.post<{ comment: Comment }>(`/issues/${issueId}/comments`, { body });
  return res.data.comment;
}

// ==================== Upvote API ====================

export async function upvoteIssue(issueId: string): Promise<UpvoteResponse> {
  const res = await api.post<UpvoteResponse>(`/issues/${issueId}/upvote`);
  return res.data;
}

