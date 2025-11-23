import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/auth";
import issuesRouter from "./routes/issues";
import { errorHandler } from "./middleware/error";
import uploadsRoutes from "./routes/uploads";
import { prisma } from './lib/prisma';



const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get('/api/health/db', async (req, res) => {
  try {
    // Minimal DB probe
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    console.error('[health/db] DB check failed:', err);
    res.status(500).json({ status: 'error', db: 'down' });
  }
});


// API routes
app.use("/api/auth", authRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/uploads", uploadsRoutes);


// 404 handler (for API only)
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// Central error handler
app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
