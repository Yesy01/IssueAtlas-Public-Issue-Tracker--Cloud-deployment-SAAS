import { Router, Request, Response } from "express";

const router = Router();

/**
 * POST /api/auth/register
 */
router.post("/register", (req: Request, res: Response) => {
  res.status(501).json({
    message: "Registration not implemented yet",
    receivedBody: req.body,
  });
});

/**
 * POST /api/auth/login
 */
router.post("/login", (req: Request, res: Response) => {
  res.status(501).json({
    message: "Login not implemented yet",
    receivedBody: req.body,
  });
});

/**
 * GET /api/auth/me
 */
router.get("/me", (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Profile endpoint not implemented yet",
  });
});

export default router;
