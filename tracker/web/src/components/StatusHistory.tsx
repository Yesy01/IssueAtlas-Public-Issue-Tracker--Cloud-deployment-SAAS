// src/components/StatusHistory.tsx
import type { StatusHistoryEntry } from "../types";
import { StatusBadge } from "./StatusBadge";
import "./StatusHistory.css";

interface StatusHistoryProps {
  history: StatusHistoryEntry[];
}

export function StatusHistory({ history }: StatusHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="status-history-empty">
        <p>No status changes recorded.</p>
      </div>
    );
  }

  return (
    <div className="status-history">
      <h4 className="status-history-title">Status History</h4>
      <div className="status-history-timeline">
        {history.map((entry, index) => (
          <div key={entry.id} className="status-history-item">
            <div className="status-history-marker" />
            <div className="status-history-content">
              <div className="status-history-change">
                <StatusBadge status={entry.oldStatus} size="small" />
                <span className="status-history-arrow">→</span>
                <StatusBadge status={entry.newStatus} size="small" />
              </div>
              <div className="status-history-date">
                {new Date(entry.changedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            {index < history.length - 1 && <div className="status-history-line" />}
          </div>
        ))}
      </div>
    </div>
  );
}
