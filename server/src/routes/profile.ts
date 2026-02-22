import { Router, Response } from "express";
import { db } from "../db/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/profile
 * Get the current user's profile.
 */
router.get(
  "/profile",
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
          authProvider: user.authProvider,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error getting profile:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération du profil.",
      });
    }
  }
);

/**
 * PUT /api/profile
 * Update the current user's profile.
 */
router.put(
  "/profile",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { displayName, avatarUrl } = req.body;

      if (!displayName || typeof displayName !== "string") {
        return res.status(400).json({
          message: "Le nom d'affichage est requis.",
        });
      }

      const trimmedName = displayName.trim();
      if (trimmedName.length < 1 || trimmedName.length > 50) {
        return res.status(400).json({
          message:
            "Le nom d'affichage doit contenir entre 1 et 50 caractères.",
        });
      }

      await db
        .update(users)
        .set({
          displayName: trimmedName,
          ...(avatarUrl !== undefined && { avatarUrl }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, req.userId!));

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, req.userId!),
      });

      return res.json({
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          displayName: updatedUser!.displayName,
          avatarUrl: updatedUser!.avatarUrl,
          authProvider: updatedUser!.authProvider,
          createdAt: updatedUser!.createdAt,
          updatedAt: updatedUser!.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        message: "Erreur lors de la mise à jour du profil.",
      });
    }
  }
);

export default router;
