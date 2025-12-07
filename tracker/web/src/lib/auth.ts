// src/lib/auth.ts
import api, { setAuthHeader } from "./api";
import type { User } from "../types";

const TOKEN_KEY = "issues_jwt";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  setAuthHeader(token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  setAuthHeader(null);
}

export async function login(
  email: string,
  password: string,
): Promise<User> {
  const res = await api.post<{ token: string; user: User }>(
    "/auth/login",
    { email, password },
  );
  const { token, user } = res.data;
  setToken(token);
  return user;
}

export async function register(
  email: string,
  password: string,
): Promise<User> {
  const res = await api.post<{ token: string; user: User }>(
    "/auth/register",
    { email, password },
  );
  const { token, user } = res.data;
  setToken(token);
  return user;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await api.get<{ user: User }>("/auth/me");
    return res.data.user;
  } catch {
    // token missing / invalid / expired, etc.
    return null;
  }
}

// So other files can still do: `import type { User } from "../lib/auth";`
export type { User };
