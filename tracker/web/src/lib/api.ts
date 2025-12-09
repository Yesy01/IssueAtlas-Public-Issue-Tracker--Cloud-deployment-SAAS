// src/lib/api.ts
import axios from "axios";
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

export function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// Keep in sync with TOKEN_KEY in src/lib/auth.ts
const TOKEN_KEY = "issues_jwt";

// Global 401 handler: clear stale tokens and redirect to auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        setAuthHeader(null);

        if (!window.location.pathname.startsWith("/auth")) {
          const params = new URLSearchParams(window.location.search);
          if (!params.get("reason")) {
            params.set("reason", "expired");
          }
          window.location.href = `/auth?${params.toString()}`;
        }
      } catch (e) {
        console.error("[api] Failed to handle 401:", e);
      }
    }

    return Promise.reject(error);
  }
);

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

export async function setOfficialResponse(
  issueId: string,
  officialResponse: string
): Promise<Issue> {
  const res = await api.patch<{ issue: Issue }>(
    `/issues/${issueId}/official-response`,
    { officialResponse }
  );
  return res.data.issue;
}

export async function verifyIssue(issueId: string): Promise<Issue> {
  const res = await api.post<{ issue: Issue }>(`/issues/${issueId}/verify`);
  return res.data.issue;
}

export async function flagIssue(issueId: string, reason?: string): Promise<Issue> {
  const res = await api.post<{ issue: Issue }>(`/issues/${issueId}/flag`, { reason });
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

// ==================== Nearby Issues API ====================

export async function getNearbyIssues(
  lat: number,
  lon: number,
  radiusMeters: number
): Promise<Issue[]> {
  const res = await api.get<{ items: Issue[] }>("/issues/nearby", {
    params: { lat, lon, radius: radiusMeters },
  });
  return res.data.items;
}

// ==================== Notifications API ====================

export interface Notification {
  id: string;
  issueId: string;
  type: "STATUS_CHANGE" | "COMMENT";
  message: string;
  read: boolean;
  createdAt: string;
  issue?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export async function getNotifications(): Promise<Notification[]> {
  const res = await api.get<{ items: Notification[] }>("/notifications");
  return res.data.items;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
