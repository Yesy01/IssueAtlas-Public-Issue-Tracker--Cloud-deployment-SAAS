// src/App.tsx
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";

import type { User } from "./types";
import { fetchCurrentUser, clearToken, getToken } from "./lib/auth";


import MapPage from "./pages/MapPage";
import ReportPage from "./pages/ReportPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";

import "./App.css";


useEffect(() => {
  const token = getToken();
  if (!token) {
    setUser(null);
    setChecking(false);
    return;
  }

  fetchCurrentUser()
    .then((u) => setUser(u))
    .catch(() => setUser(null))
    .finally(() => setChecking(false));
}, []);

interface LayoutProps {
  user: User | null;
  setUser: (u: User | null) => void;
}

function Layout({ user, setUser }: LayoutProps) {
  const location = useLocation();

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <nav className="nav-bar">
          <div className="nav-left">
            <span className="logo">Issues Tracker</span>
            <Link to="/" className="nav-link">
              Map
            </Link>
            <Link to="/report" className="nav-link">
              Report
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            )}
          </div>
          <div className="nav-right">
            {user ? (
              <>
                <span className="nav-user">
                  {user.email} ({user.role})
                </span>
                <button className="nav-button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                state={{ from: location.pathname }}
                className="nav-link"
              >
                Login / Register
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<MapPage user={user} />} />
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
              user && user.role === "admin" ? (
                <AdminPage user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/auth" element={<AuthPage setUser={setUser} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .finally(() => setBootstrapped(true));
  }, []);

  if (!bootstrapped) {
    return (
      <div className="app-root">
        <div className="boot-splash">Loading…</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout user={user} setUser={setUser} />
    </BrowserRouter>
  );
}
