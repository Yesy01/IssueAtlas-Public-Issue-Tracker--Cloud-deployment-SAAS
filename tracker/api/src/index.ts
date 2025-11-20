import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/auth";
import issuesRouter from "./routes/issues";

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Simple health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Mount feature routers
app.use("/api/auth", authRouter);
app.use("/api/issues", issuesRouter);

// 404 handler for unknown routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
  });
});

// Central error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);

  const status = err.status ?? 500;
  const message =
    status === 500 ? "Internal server error" : err.message ?? "Error";

  res.status(status).json({
    error: message,
  });
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

export default app;
