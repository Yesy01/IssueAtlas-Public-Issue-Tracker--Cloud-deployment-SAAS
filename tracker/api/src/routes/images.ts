import { Router } from "express";
import { downloadIssueFile } from "../lib/azureBlob";

const router = Router();

// Public image proxy (no auth)
router.get("/:key", async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const { stream, contentType } = await downloadIssueFile(key);

    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
