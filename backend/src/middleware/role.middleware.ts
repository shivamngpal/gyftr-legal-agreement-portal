import { Request, Response, NextFunction } from "express";
import { Role } from "../generated/prisma/enums";

/**
 * Middleware factory to restrict access based on user roles.
 * Must be used AFTER the authenticate middleware.
 *
 * @param allowedRoles List of roles that are permitted to access the route.
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // req.user should be populated by the authenticate middleware
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: User not authenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }

    next();
  };
};
