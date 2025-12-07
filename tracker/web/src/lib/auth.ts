// src/lib/auth.ts
import type { User } from "../types";
import { api, setAuthHeader } from "./api";

const TOKEN_KEY = "issues_jwt";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  setAuthHeader(token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  setAuthHeader(null);
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await api.get<{ user: User }>("/auth/me");
    return res.data.user;
  } catch {
    return null;
  }
}
