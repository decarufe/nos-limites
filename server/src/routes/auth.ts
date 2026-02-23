import { Router, Request, Response } from "express";
import { db } from "../db/connection";
import { users, magicLinks, sessions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveFrontendBaseUrl } from "../utils/frontend-url";
import { emailService } from "../services/email";
import {
  createDeviceToken,
  refreshDeviceToken,
} from "../services/deviceService";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

/**
 * POST /api/auth/magic-link
 * Send a magic link to the user's email.
 * In development mode, the link is logged to the console.
 */
router.post("/auth/magic-link", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Adresse email requise.",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Adresse email invalide.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate magic link token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Check for an existing unused, non-expired magic link for this email
    const existingLink = await db.query.magicLinks.findFirst({
      where: and(
        eq(magicLinks.email, normalizedEmail),
        eq(magicLinks.used, false),
      ),
    });

    if (existingLink && new Date(existingLink.expiresAt) > new Date()) {
      // Reuse existing record: update token and expiration
      await db
        .update(magicLinks)
        .set({ token, expiresAt })
        .where(eq(magicLinks.id, existingLink.id));
    } else {
      // No reusable link found — insert a new record
      await db.insert(magicLinks).values({
        id: uuidv4(),
        email: normalizedEmail,
        token,
        expiresAt,
        used: false,
      });
    }

    // Build magic link URL
    const magicLinkBaseUrl = resolveFrontendBaseUrl(req, {
      preferredBaseUrl: process.env.MAGIC_LINK_BASE_URL,
    });
    const magicLinkUrl = `${magicLinkBaseUrl}/auth/verify?token=${token}`;

    // Send the magic link via configured email provider
    await emailService.sendMagicLink({
      to: normalizedEmail,
      magicLinkUrl,
      expiresInMinutes: 15,
    });

    return res.json({
      message:
        "Lien magique envoyé ! Vérifiez votre boîte mail (ou la console en mode développement).",
      // In dev mode, also return the token for easier testing
      ...(process.env.NODE_ENV === "development" && {
        token,
        url: magicLinkUrl,
      }),
    });
  } catch (error) {
    console.error("Error sending magic link:", error);
    return res.status(500).json({
      message: "Erreur lors de l'envoi du lien magique.",
    });
  }
});

/**
 * GET /api/auth/verify?token=xxx
 * Verify a magic link token and create/login the user.
 */
router.get("/auth/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        message: "Token manquant.",
      });
    }

    // Find the magic link
    const magicLink = await db.query.magicLinks.findFirst({
      where: eq(magicLinks.token, token),
    });

    if (!magicLink) {
      return res.status(404).json({
        message: "Lien magique invalide ou expiré.",
      });
    }

    // Check if already used
    if (magicLink.used) {
      return res.status(400).json({
        message: "Ce lien magique a déjà été utilisé.",
      });
    }

    // Check expiration
    if (new Date(magicLink.expiresAt) < new Date()) {
      return res.status(400).json({
        message: "Ce lien magique a expiré. Veuillez en demander un nouveau.",
      });
    }

    // Mark magic link as used
    await db
      .update(magicLinks)
      .set({ used: true })
      .where(eq(magicLinks.id, magicLink.id));

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, magicLink.email),
    });

    let isNewUser = false;

    if (!user) {
      // Create new user with temporary display name
      isNewUser = true;
      const userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        email: magicLink.email,
        displayName: magicLink.email.split("@")[0], // Temporary name
        authProvider: "magic_link",
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    }

    if (!user) {
      return res.status(500).json({
        message: "Erreur lors de la création du compte.",
      });
    }

    // Create JWT token
    const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "30d",
    });

    // Create session
    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 30 days

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token: jwtToken,
      expiresAt: sessionExpiresAt,
    });

    // Always register a device token for persistent sessions
    const device = await createDeviceToken(
      user.id,
      req.headers["user-agent"]?.substring(0, 120) || "Navigateur",
    );

    return res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      isNewUser,
      deviceId: device.deviceId,
      deviceToken: device.deviceToken,
    });
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({
      message: "Erreur lors de la vérification du lien magique.",
    });
  }
});

/**
 * POST /api/auth/device/refresh
 * Refresh an expired session using a long-lived device token.
 * Returns a new JWT, new device token (rotation), and user info.
 */
router.post("/auth/device/refresh", async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceToken } = req.body;

    if (
      !deviceId ||
      !deviceToken ||
      typeof deviceId !== "string" ||
      typeof deviceToken !== "string"
    ) {
      return res.status(400).json({
        message: "Device ID et token requis.",
      });
    }

    const result = await refreshDeviceToken(deviceId, deviceToken);

    // Fetch user info for the response
    const user = await db.query.users.findFirst({
      where: eq(users.id, result.userId),
    });

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur non trouvé.",
      });
    }

    return res.json({
      token: result.jwtToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      deviceId,
      deviceToken: result.deviceToken,
    });
  } catch (error: any) {
    console.error("Device refresh failed:", error?.message);
    return res.status(401).json({
      message: "Session d'appareil invalide ou expirée.",
    });
  }
});

/**
 * GET /api/auth/session
 * Check current session and return user info.
 */
router.get(
  "/auth/session",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.userId!),
      });

      if (!user) {
        return res.status(404).json({
          message: "Utilisateur non trouvé.",
        });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      console.error("Error checking session:", error);
      return res.status(500).json({
        message: "Erreur lors de la vérification de la session.",
      });
    }
  },
);

/**
 * POST /api/auth/logout
 * Logout the current user by invalidating their session.
 */
router.post(
  "/auth/logout",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];

      if (token) {
        await db.delete(sessions).where(eq(sessions.token, token));
      }

      return res.json({
        message: "Déconnexion réussie.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      return res.status(500).json({
        message: "Erreur lors de la déconnexion.",
      });
    }
  },
);

export default router;
