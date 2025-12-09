import { Router, Request, Response } from "express";
import multer from "multer";
import { authGuard } from "../middleware/authGuard";
import { uploadIssueFile } from "../lib/azureBlob";

const router = Router();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// store file in memory; 5 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
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

    const { mimetype, size, originalname } = req.file;

    if (size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: "File too large (max 5 MB)" });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return res.status(400).json({ error: "Invalid file type; only images are allowed" });
    }

    const ext = originalname.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        error: "Invalid file extension; allowed extensions: jpg, jpeg, png, webp",
      });
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
