import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/auth";

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"];

  if (!header || typeof header !== "string") {
    return res
      .status(401)
      .json({ error: "Missing Authorization header (expected Bearer token)" });
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Invalid Authorization header format" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role, email: payload.email };
    return next();
  } catch (err) {
    console.error("[authGuard] Token verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
