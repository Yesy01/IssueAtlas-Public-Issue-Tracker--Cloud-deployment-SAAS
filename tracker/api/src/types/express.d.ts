type UserRole = "user" | "admin";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: UserRole;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Make this a module
export {};
