import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./lib/api";
import { clearToken, getToken } from "./lib/auth";
import type { User } from "./types";
import { AuthPage } from "./pages/AuthPage";
import { MapPage } from "./pages/MapPage";
import { ReportPage } from "./pages/ReportPage";
import { AdminPage } from "./pages/AdminPage";
import { IssueDetailsPage } from "./pages/IssueDetailsPage";
import MyIssuesPage from "./pages/MyIssuesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { NotificationBell } from "./components";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: "1rem" }}>Loading...</div>;
  }

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <div>
      <header
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <nav style={{ display: "flex", gap: "1rem" }}>
          <Link to="/">Map</Link>
          <Link to="/report">Report</Link>
          <Link to="/my-issues">My Issues</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/admin">Admin</Link>
        </nav>
        <div>
          {user ? (
            <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <NotificationBell user={user} />
              <span>
                {user.email} ({user.role})
              </span>
              <button onClick={handleLogout}>Logout</button>
            </span>
          ) : (
            location.pathname !== "/auth" && <Link to="/auth">Login / Register</Link>
          )}
        </div>
      </header>

      <main style={{ padding: "1rem" }}>
        <Routes>
          <Route path="/" element={<MapPage user={user} />} />
          <Route path="/issues/:id" element={<IssueDetailsPage user={user} />} />
          <Route path="/my-issues" element={<MyIssuesPage user={user} />} />
          <Route path="/analytics" element={<AnalyticsPage user={user} />} />
          <Route path="/auth" element={<AuthPage onAuth={setUser} />} />
          <Route
            path="/report"
            element={
              user ? (
                <ReportPage user={user} />
              ) : (
                <Navigate to="/auth" replace state={{ from: "/report" }} />
              )
            }
          />
          <Route
            path="/admin"
            element={
              user?.role === "admin" ? (
                <AdminPage user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}
