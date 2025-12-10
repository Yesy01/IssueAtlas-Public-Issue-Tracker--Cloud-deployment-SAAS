import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";

type UserRole = "user" | "admin";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  email?: string;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

export function signAccessToken(
  payload: AuthTokenPayload,
  expiresIn: SignOptions["expiresIn"] = "1h"
): string {
  const options: SignOptions = expiresIn ? { expiresIn } : {};
  return jwt.sign(payload, JWT_SECRET as Secret, options);
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
    email: typeof decoded.email === "string" ? decoded.email : undefined,
  };
}
