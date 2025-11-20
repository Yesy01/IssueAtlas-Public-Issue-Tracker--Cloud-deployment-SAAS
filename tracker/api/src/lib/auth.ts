import jwt, { JwtPayload } from "jsonwebtoken";

type UserRole = "user" | "admin";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret";

if (!process.env.JWT_SECRET) {
  // Fine for local dev; in prod/VM this MUST be set properly.
  console.warn(
    "[auth] JWT_SECRET is not set, falling back to an insecure dev secret."
  );
}

export function signAccessToken(
  payload: AuthTokenPayload,
  expiresIn: string = "7d"
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  const role = decoded.role as UserRole;
  if (role !== "user" && role !== "admin") {
    throw new Error("Invalid role in token");
  }

  return {
    userId: decoded.userId,
    role,
  };
}
