import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error with full details
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip
  });

  if (res.headersSent) {
    return;
  }

  // Return generic error to client (don't expose internal details)
  return res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}
