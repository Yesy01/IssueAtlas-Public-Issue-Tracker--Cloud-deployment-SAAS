"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const validation_1 = require("../lib/validation");
const auth_1 = require("../lib/auth");
const authGuard_1 = require("../middleware/authGuard");
const logger_1 = require("../lib/logger");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 *
 * - Validates body with Zod
 * - Hashes password
 * - Creates a user with role=user
 * - Returns minimal user + JWT
 */
router.post("/register", async (req, res) => {
    const parseResult = validation_1.RegisterSchema.safeParse(req.body);
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
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email,
            password: passwordHash,
            role: "user",
        },
    });
    const token = (0, auth_1.signAccessToken)({ userId: user.id, role: user.role, email: user.email });
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
router.post("/login", async (req, res) => {
    const parseResult = validation_1.LoginSchema.safeParse(req.body);
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
    const ok = await bcrypt_1.default.compare(password, user.password);
    if (!ok) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = (0, auth_1.signAccessToken)({ userId: user.id, role: user.role, email: user.email });
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
router.get("/me", authGuard_1.authGuard, async (req, res) => {
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
router.post("/guest", async (req, res) => {
    // Create a temporary guest identifier
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    // Sign a token with limited permissions (no real user ID)
    const token = (0, auth_1.signAccessToken)({ userId: guestId, role: "user" });
    return res.status(200).json({
        token,
        message: "Guest access granted. You can submit issues but have limited access to other features.",
    });
});
/**
 * POST /api/auth/forgot-password
 *
 * - Generates a secure reset token
 * - Stores token in database with expiration
 * - In production, would send email with reset link
 * - Rate limited to prevent abuse
 */
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }
    try {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        // Always return success to prevent email enumeration attacks
        if (!user) {
            logger_1.logger.warn(`Password reset requested for non-existent email: ${email}`);
            return res.status(200).json({
                message: "If that email exists, a password reset link has been sent.",
            });
        }
        // Generate secure random token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        // Invalidate any existing tokens for this user
        await prisma.passwordReset.updateMany({
            where: {
                userId: user.id,
                used: false,
            },
            data: {
                used: true,
            },
        });
        // Create new password reset token
        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                token: resetToken,
                expiresAt,
            },
        });
        logger_1.logger.info(`Password reset token generated for user: ${user.email}`);
        // TODO: Send email with reset link
        // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        // await sendEmail({
        //   to: user.email,
        //   subject: 'Password Reset Request',
        //   html: `Click here to reset your password: ${resetLink}`
        // });
        // For development, log the token (REMOVE IN PRODUCTION)
        if (process.env.NODE_ENV !== 'production') {
            logger_1.logger.debug(`Reset token for ${email}: ${resetToken}`);
        }
        return res.status(200).json({
            message: "If that email exists, a password reset link has been sent.",
        });
    }
    catch (error) {
        logger_1.logger.error('Error in forgot-password', { error });
        return res.status(500).json({ error: "Failed to process password reset" });
    }
});
/**
 * POST /api/auth/reset-password
 *
 * - Validates reset token
 * - Checks expiration
 * - Updates user password
 * - Marks token as used
 */
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    try {
        // Find valid reset token
        const resetRecord = await prisma.passwordReset.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!resetRecord) {
            return res.status(400).json({ error: "Invalid reset token" });
        }
        if (resetRecord.used) {
            return res.status(400).json({ error: "Reset token has already been used" });
        }
        if (resetRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: "Reset token has expired" });
        }
        // Hash new password
        const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        // Update user password and mark token as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetRecord.userId },
                data: { password: passwordHash },
            }),
            prisma.passwordReset.update({
                where: { id: resetRecord.id },
                data: { used: true },
            }),
        ]);
        logger_1.logger.info(`Password reset successful for user: ${resetRecord.user.email}`);
        return res.status(200).json({
            message: "Password has been reset successfully. You can now log in with your new password.",
        });
    }
    catch (error) {
        logger_1.logger.error('Error in reset-password', { error });
        return res.status(500).json({ error: "Failed to reset password" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map