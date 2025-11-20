import { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[errorHandler]", err);

  if (res.headersSent) {
    return;
  }

  // You can branch on known error types here if needed.
  return res.status(500).json({
    error: "Internal server error",
  });
}
