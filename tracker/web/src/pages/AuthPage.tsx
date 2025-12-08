// src/pages/AuthPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import type { User } from "../types";
import "./AuthPage.css";
import type { FormEvent } from "react";

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthPageProps {
  onAuth?(user: User): void;
  setUser?(user: User): void;
}

export function AuthPage({ onAuth, setUser }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await api.post<AuthResponse>(endpoint, { email, password });
      setToken(res.data.token);
      const applyUser = onAuth ?? setUser;
      applyUser?.(res.data.user);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in to report and track community issues"
              : "Join us to help improve your community"}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className="auth-tab"
            onClick={() => setMode("login")}
            disabled={mode === "login"}
          >
            Login
          </button>
          <button
            type="button"
            className="auth-tab"
            onClick={() => setMode("register")}
            disabled={mode === "register"}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
            {mode === "register" && (
              <p className="form-hint">
                Must be at least 8 characters long
              </p>
            )}
          </div>

          {error && (
            <div className="auth-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner"></span>
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        <div className="guest-access-section">
          <div className="divider">
            <span className="divider-text">OR</span>
          </div>
          <p className="guest-access-text">
            Want to report an issue without creating an account?
          </p>
          <button
            type="button"
            onClick={() => navigate("/guest-report")}
            className="guest-access-btn"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
