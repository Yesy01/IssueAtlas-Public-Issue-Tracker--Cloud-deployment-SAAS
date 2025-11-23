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

export interface Issue {
  id: string;
  reporterId: string;
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
}
