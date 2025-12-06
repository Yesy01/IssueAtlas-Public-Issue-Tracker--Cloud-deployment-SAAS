// src/components/StatusBadge.tsx
import type { IssueStatus } from "../types";
import "./StatusBadge.css";

interface StatusBadgeProps {
  status: IssueStatus;
  size?: "small" | "medium" | "large";
}

// Status colors matching design document
export const STATUS_COLORS: Record<IssueStatus, string> = {
  new: "#FFEB3B", // Yellow
  triaged: "#2196F3", // Blue
  in_progress: "#FF9800", // Orange
  resolved: "#4CAF50", // Green
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function StatusBadge({ status, size = "medium" }: StatusBadgeProps) {
  const backgroundColor = STATUS_COLORS[status];
  // Use dark text for light backgrounds (yellow, orange)
  const textColor = status === "new" || status === "in_progress" ? "#000" : "#fff";

  return (
    <span
      className={`status-badge ${size}`}
      style={{ backgroundColor, color: textColor }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
