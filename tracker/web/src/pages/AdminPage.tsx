// src/pages/AdminPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Issue, IssueStatus, User } from "../types";
import { StatusBadge } from "../components";
import "./AdminPage.css";

interface AdminPageProps {
  user: User;
}

export function AdminPage({ user: _user }: AdminPageProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | IssueStatus>("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = filter === "all" ? {} : { status: filter };
      const res = await api.get<{ items: Issue[] }>("/issues", { params });
      setIssues(res.data.items);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load issues");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function changeStatus(id: string, newStatus: IssueStatus) {
    try {
      await api.patch(`/issues/${id}/status`, { newStatus });
      await load();
    } catch (err: unknown) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="header-content">
          <h1>Admin Panel</h1>
          <p className="subtitle">Manage and triage reported issues</p>
        </div>
        <Link to="/" className="back-link">
          ← Back to Map
        </Link>
      </div>

      <div className="admin-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Issues
        </button>
        <button
          className={`filter-btn ${filter === "new" ? "active" : ""}`}
          onClick={() => setFilter("new")}
        >
          New
        </button>
        <button
          className={`filter-btn ${filter === "triaged" ? "active" : ""}`}
          onClick={() => setFilter("triaged")}
        >
          Triaged
        </button>
        <button
          className={`filter-btn ${filter === "in_progress" ? "active" : ""}`}
          onClick={() => setFilter("in_progress")}
        >
          In Progress
        </button>
        <button
          className={`filter-btn ${filter === "resolved" ? "active" : ""}`}
          onClick={() => setFilter("resolved")}
        >
          Resolved
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading issues...</p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          {issues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No issues found</h3>
              <p>
                {filter === "all"
                  ? "No issues have been reported yet."
                  : `No ${filter.replace("_", " ")} issues at the moment.`}
              </p>
            </div>
          ) : (
            <div className="issues-grid">
              {issues.map((issue) => (
                <div key={issue.id} className="admin-issue-card">
                  <div className="issue-header">
                    <div className="issue-meta">
                      <span className="issue-type-badge">{issue.type}</span>
                      <StatusBadge status={issue.status} />
                    </div>
                    <Link to={`/issues/${issue.id}`} className="view-details-btn">
                      View Details →
                    </Link>
                  </div>

                  <h3 className="issue-title">{issue.title}</h3>
                  <p className="issue-description">
                    {issue.description.length > 120
                      ? `${issue.description.substring(0, 120)}...`
                      : issue.description}
                  </p>

                  <div className="issue-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{issue.areaName || "Unknown location"}</span>
                  </div>

                  <div className="issue-date">
                    Reported on {formatDate(issue.createdAt)}
                  </div>

                  <div className="status-actions">
                    <button
                      className={`status-btn new ${issue.status === "new" ? "current" : ""}`}
                      onClick={() => changeStatus(issue.id, "new")}
                      disabled={issue.status === "new"}
                    >
                      New
                    </button>
                    <button
                      className={`status-btn triaged ${issue.status === "triaged" ? "current" : ""}`}
                      onClick={() => changeStatus(issue.id, "triaged")}
                      disabled={issue.status === "triaged"}
                    >
                      Triaged
                    </button>
                    <button
                      className={`status-btn in-progress ${issue.status === "in_progress" ? "current" : ""}`}
                      onClick={() => changeStatus(issue.id, "in_progress")}
                      disabled={issue.status === "in_progress"}
                    >
                      In Progress
                    </button>
                    <button
                      className={`status-btn resolved ${issue.status === "resolved" ? "current" : ""}`}
                      onClick={() => changeStatus(issue.id, "resolved")}
                      disabled={issue.status === "resolved"}
                    >
                      Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
