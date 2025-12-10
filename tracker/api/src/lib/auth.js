"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
function signAccessToken(payload, expiresIn = "1h") {
    const options = expiresIn ? { expiresIn } : {};
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
}
function verifyAccessToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    if (!decoded ||
        typeof decoded !== "object" ||
        typeof decoded.userId !== "string" ||
        typeof decoded.role !== "string") {
        throw new Error("Invalid token payload");
    }
    const role = decoded.role;
    if (role !== "user" && role !== "admin") {
        throw new Error("Invalid role in token");
    }
    return {
        userId: decoded.userId,
        role,
        email: typeof decoded.email === "string" ? decoded.email : undefined,
    };
}
//# sourceMappingURL=auth.js.map