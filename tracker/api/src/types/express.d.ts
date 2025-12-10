type UserRole = "user" | "admin";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: UserRole;
      email?: string;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Make this a module
export {};
