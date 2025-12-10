"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const azureBlob_1 = require("../lib/azureBlob");
const router = (0, express_1.Router)();
// Public image proxy (no auth)
router.get("/:key", async (req, res, next) => {
    try {
        const key = decodeURIComponent(req.params.key);
        const { stream, contentType } = await (0, azureBlob_1.downloadIssueFile)(key);
        res.setHeader("Content-Type", contentType || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=86400");
        stream.pipe(res);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=images.js.map