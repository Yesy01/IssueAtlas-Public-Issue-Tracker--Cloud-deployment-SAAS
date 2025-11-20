import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/issues
 * Query params (later): status, type, bbox, search, etc.
 */
router.get("/", (req: Request, res: Response) => {
  // TODO: implement DB-backed listing with filters + bbox
  res.json({
    message: "Issue listing not implemented yet",
    items: [],
    query: req.query,
  });
});

/**
 * POST /api/issues
 * Body (later): title, description, type, lat, lon, imageUrl, etc.
 */
router.post("/", (req: Request, res: Response) => {
  // TODO: implement issue creation (auth, validation, Prisma)
  res.status(501).json({
    message: "Issue creation not implemented yet",
    receivedBody: req.body,
  });
});

export default router;
