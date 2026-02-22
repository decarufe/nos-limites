import { Router, Request, Response } from "express";
import { db } from "../db/connection";
import { users, magicLinks, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveFrontendBaseUrl } from "../utils/frontend-url";
import { emailService } from "../services/email";

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

    // Store magic link in database
    await db.insert(magicLinks).values({
      id: uuidv4(),
      email: normalizedEmail,
      token,
      expiresAt,
      used: false,
    });

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

    return res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      isNewUser,
    });
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({
      message: "Erreur lors de la vérification du lien magique.",
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
