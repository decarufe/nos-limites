import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface UserClaims {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthRequest extends Request {
  userId?: string;
  userClaims?: UserClaims;
}

/**
 * Authentication middleware - verifies JWT token from Authorization header.
 * Uses stateless JWT verification (signature + expiry only).
 * No database lookup — works reliably in serverless environments where DB
 * storage may be ephemeral across invocations.
 *
 * Session revocation on logout is handled client-side (clearing localStorage).
 * The 30-day JWT expiry provides the natural session boundary.
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
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
      process.env.JWT_SECRET || "dev-secret-change-in-production",
    ) as {
      userId: string;
      email?: string;
      displayName?: string;
      avatarUrl?: string | null;
    };

    req.userId = decoded.userId;
    // Attach profile claims if present (tokens issued after the v2 format)
    if (decoded.email) {
      req.userClaims = {
        email: decoded.email,
        displayName: decoded.displayName ?? decoded.email.split("@")[0],
        avatarUrl: decoded.avatarUrl ?? null,
      };
    }
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expirée ou invalide. Veuillez vous reconnecter.",
    });
  }
}
