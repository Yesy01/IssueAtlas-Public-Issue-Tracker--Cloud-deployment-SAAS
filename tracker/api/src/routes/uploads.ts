import { Router, Request, Response } from "express";
import multer from "multer";
import { authGuard } from "../middleware/authGuard";
import { uploadIssueFile } from "../lib/azureBlob";

const router = Router();

// store file in memory; 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

router.post(
  "/",
  authGuard,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded (field: file)" });
    }

    // Optional: allow client to send issueId in body for nicer path structure
    const issueId =
      typeof req.body.issueId === "string" && req.body.issueId.trim()
        ? req.body.issueId.trim()
        : undefined;

    try {
      const { key, url } = await uploadIssueFile(req.file, { issueId });
      return res.status(201).json({ key, url });
    } catch (err) {
      console.error("[POST /api/uploads] error:", err);
      return res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

export default router;
