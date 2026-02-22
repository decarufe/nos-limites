import { Router, Response } from "express";
import { db } from "../db/connection";
import {
  users,
  sessions,
  userLimits,
  relationships,
  notifications,
  blockedUsers,
  magicLinks,
} from "../db/schema";
import { eq, or } from "drizzle-orm";
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
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({
          message:
            "Le nom d'affichage doit contenir entre 2 et 50 caractères.",
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

/**
 * DELETE /api/profile
 * Delete the current user's account and all associated data.
 * This is an irreversible operation.
 */
router.delete(
  "/profile",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // Verify user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return res.status(404).json({
          message: "Utilisateur non trouvé.",
        });
      }

      console.log(`[Account Deletion] Deleting account for user: ${userId} (${user.email})`);

      // Delete all related data (cascading through foreign keys should handle most,
      // but let's be explicit for safety)

      // 1. Delete user_limits
      await db.delete(userLimits).where(eq(userLimits.userId, userId));

      // 2. Delete notifications (both sent to user and referencing user)
      await db.delete(notifications).where(eq(notifications.userId, userId));

      // 3. Delete blocked users (both directions)
      await db.delete(blockedUsers).where(
        or(
          eq(blockedUsers.blockerId, userId),
          eq(blockedUsers.blockedId, userId)
        )
      );

      // 4. Delete relationships (both as inviter and invitee)
      await db.delete(relationships).where(
        or(
          eq(relationships.inviterId, userId),
          eq(relationships.inviteeId, userId)
        )
      );

      // 5. Delete sessions
      await db.delete(sessions).where(eq(sessions.userId, userId));

      // 6. Delete magic links associated with the email
      await db.delete(magicLinks).where(eq(magicLinks.email, user.email));

      // 7. Finally delete the user
      await db.delete(users).where(eq(users.id, userId));

      console.log(`[Account Deletion] Successfully deleted account for user: ${userId}`);

      return res.json({
        message: "Votre compte a été supprimé avec succès.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      return res.status(500).json({
        message: "Erreur lors de la suppression du compte.",
      });
    }
  }
);

export default router;
