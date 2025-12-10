import { SignOptions } from "jsonwebtoken";
type UserRole = "user" | "admin";
export interface AuthTokenPayload {
    userId: string;
    role: UserRole;
    email?: string;
}
export declare function signAccessToken(payload: AuthTokenPayload, expiresIn?: SignOptions["expiresIn"]): string;
export declare function verifyAccessToken(token: string): AuthTokenPayload;
export {};
//# sourceMappingURL=auth.d.ts.map