import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import authRouter from "./routes/auth";
import issuesRouter from "./routes/issues";
import analyticsRouter from "./routes/analytics";
import notificationsRouter from "./routes/notifications";
import { errorHandler } from "./middleware/error";
import uploadsRoutes from "./routes/uploads";
import { prisma } from './lib/prisma';
import healthRouter from "./routes/health";
import { generalLimiter, authLimiter, uploadLimiter } from "./middleware/rateLimit";
import { xssProtection, cspHeaders } from "./middleware/security";
import { logger, morganStream } from "./lib/logger";
import { requestLogger } from "./middleware/requestLogger";



const app = express();
const PORT = process.env.PORT || 8080;

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: false, // We'll use custom CSP
  crossOriginEmbedderPolicy: false // Allow external resources
}));

// Custom security headers
app.use(cspHeaders);

// XSS protection middleware
app.use(xssProtection);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000']; // Default for development

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: morganStream }));
} else {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Apply general rate limiting to all API routes
app.use("/api", generalLimiter);

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
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/uploads", uploadLimiter, uploadsRoutes);
app.use("/api/health", healthRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/notifications", notificationsRouter);


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
  logger.info(`API server started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});
