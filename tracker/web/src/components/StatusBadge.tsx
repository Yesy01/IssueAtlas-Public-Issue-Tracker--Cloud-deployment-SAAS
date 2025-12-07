// src/components/StatusBadge.tsx
import type { IssueStatus } from "../types";
import { STATUS_COLORS, STATUS_LABELS } from "../lib/status";
import "./StatusBadge.css";

interface StatusBadgeProps {
  status: IssueStatus;
  size?: "small" | "medium" | "large";
}

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
