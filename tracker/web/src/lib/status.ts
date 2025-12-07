// src/lib/status.ts
import type { IssueStatus } from "../types";

export const STATUS_COLORS: Record<IssueStatus, string> = {
  new: "#FFEB3B",
  triaged: "#2196F3",
  in_progress: "#FF9800",
  resolved: "#4CAF50",
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In Progress",
  resolved: "Resolved",
};
