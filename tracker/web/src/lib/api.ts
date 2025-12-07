// src/lib/api.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "/api";

const api = axios.create({
  baseURL,
});

export function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;
export { api };
