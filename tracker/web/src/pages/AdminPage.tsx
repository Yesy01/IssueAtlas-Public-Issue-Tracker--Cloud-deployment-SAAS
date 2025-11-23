// src/pages/AdminPage.tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Issue, IssueStatus, User } from "../types";

interface AdminPageProps {
  user: User;
}

export function AdminPage({ user }: AdminPageProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: Issue[] }>("/issues", {
        params: { status: "new" },
      });
      setIssues(res.data.items);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load issues");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: string, newStatus: IssueStatus) {
    try {
      await api.patch(`/issues/${id}/status`, { newStatus });
      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  return (
    <div>
      <h2>Admin triage</h2>
      <p>Logged in as {user.email}</p>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <ul style={{ padding: 0 }}>
        {issues.map((issue) => (
          <li
            key={issue.id}
            style={{
              listStyle: "none",
              padding: "0.5rem",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>{issue.title}</strong> ({issue.type})<br />
            <div>{issue.description}</div>
            <div>Current status: {issue.status}</div>
            <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.5rem" }}>
              <button onClick={() => changeStatus(issue.id, "triaged")}>
                Triaged
              </button>
              <button onClick={() => changeStatus(issue.id, "in_progress")}>
                In progress
              </button>
              <button onClick={() => changeStatus(issue.id, "resolved")}>
                Resolved
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!loading && issues.length === 0 && <div>No new issues.</div>}
    </div>
  );
}
