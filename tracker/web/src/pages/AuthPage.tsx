// src/pages/AuthPage.tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import type { User } from "../types";

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthPageProps {
  onAuth(user: User): void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await api.post<AuthResponse>(endpoint, { email, password });
      setToken(res.data.token);
      onAuth(res.data.user);
      navigate("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Auth failed";
      setError(msg);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => setMode("login")}
          disabled={mode === "login"}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          disabled={mode === "register"}
          style={{ marginLeft: "0.5rem" }}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: "0.5rem" }}>{error}</div>
        )}

        <button type="submit">
          {mode === "login" ? "Login" : "Register"}
        </button>
      </form>
    </div>
  );
}
