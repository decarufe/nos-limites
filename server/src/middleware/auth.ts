import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/connection";
import { sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Authentication middleware - verifies JWT token from Authorization header.
 * Also checks that the session still exists in the database (not logged out).
 * Adds userId to request object if valid.
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentification requise. Veuillez vous connecter.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret-change-in-production"
    ) as { userId: string };

    // Check that the session still exists in the database
    // (it gets deleted on logout)
    db.query.sessions
      .findFirst({
        where: eq(sessions.token, token),
      })
      .then((session) => {
        if (!session) {
          return res.status(401).json({
            message: "Session expirée ou invalide. Veuillez vous reconnecter.",
          });
        }

        // Check session expiration
        if (new Date(session.expiresAt) < new Date()) {
          return res.status(401).json({
            message: "Session expirée. Veuillez vous reconnecter.",
          });
        }

        req.userId = decoded.userId;
        next();
      })
      .catch(() => {
        return res.status(401).json({
          message: "Session expirée ou invalide. Veuillez vous reconnecter.",
        });
      });
  } catch (error) {
    return res.status(401).json({
      message: "Session expirée ou invalide. Veuillez vous reconnecter.",
    });
  }
}
