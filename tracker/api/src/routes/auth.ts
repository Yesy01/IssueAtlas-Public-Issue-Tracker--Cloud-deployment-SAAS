import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { RegisterSchema, LoginSchema } from "../lib/validation";
import { signAccessToken } from "../lib/auth";
import { authGuard } from "../middleware/authGuard";

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /api/auth/register
 *
 * - Validates body with Zod
 * - Hashes password
 * - Creates a user with role=user
 * - Returns minimal user + JWT
 */
router.post("/register", async (req: Request, res: Response) => {
  const parseResult = RegisterSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return res
      .status(409)
      .json({ error: "User with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      role: "user",
    },
  });

  const token = signAccessToken({ userId: user.id, role: user.role });

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /api/auth/login
 *
 * - Validates body
 * - Looks up user by email
 * - Compares password with bcrypt
 * - Returns JWT if valid
 */
router.post("/login", async (req: Request, res: Response) => {
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signAccessToken({ userId: user.id, role: user.role });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

/**
 * GET /api/auth/me
 *
 * - Requires authGuard
 * - Returns current user’s basic info
 */
router.get("/me", authGuard, async (req: Request, res: Response) => {
  if (!req.user) {
    // Shouldn't happen if authGuard worked, but be defensive
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    // Token valid but user gone (deleted) = treat as 401
    return res.status(401).json({ error: "User not found" });
  }

  return res.json({ user });
});

/**
 * POST /api/auth/guest
 *
 * - Creates a temporary guest token for anonymous issue submission
 * - Guest can only create issues, not view/comment/upvote
 */
router.post("/guest", async (req: Request, res: Response) => {
  // Create a temporary guest identifier
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Sign a token with limited permissions (no real user ID)
  const token = signAccessToken({ userId: guestId, role: "guest" });

  return res.status(200).json({
    token,
    message: "Guest access granted. You can submit issues but have limited access to other features.",
  });
});

export default router;
