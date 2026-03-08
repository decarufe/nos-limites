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
  limits,
  devices,
  notificationEmailSettings,
} from "../db/schema";
import { eq, or } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * GET /api/profile
 * Get the current user's profile.
 */
router.get("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
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
});

/**
 * PUT /api/profile
 * Update the current user's profile.
 */
router.put("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
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
        message: "Le nom d'affichage doit contenir entre 2 et 50 caractères.",
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
});

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

      console.log(
        `[Account Deletion] Deleting account for user: ${userId} (${user.email})`,
      );

      // Delete all related data (cascading through foreign keys should handle most,
      // but let's be explicit for safety)

      // 1. Delete user_limits
      await db.delete(userLimits).where(eq(userLimits.userId, userId));

      // 2. Delete notifications (both sent to user and referencing user as relatedUserId)
      await db
        .delete(notifications)
        .where(
          or(
            eq(notifications.userId, userId),
            eq(notifications.relatedUserId, userId),
          ),
        );

      // 3. Delete blocked users (both directions)
      await db
        .delete(blockedUsers)
        .where(
          or(
            eq(blockedUsers.blockerId, userId),
            eq(blockedUsers.blockedId, userId),
          ),
        );

      // 4. Delete relationships (both as inviter and invitee)
      await db
        .delete(relationships)
        .where(
          or(
            eq(relationships.inviterId, userId),
            eq(relationships.inviteeId, userId),
          ),
        );

      // 5. Delete devices (refresh tokens)
      await db.delete(devices).where(eq(devices.userId, userId));

      // 6. Delete sessions
      await db.delete(sessions).where(eq(sessions.userId, userId));

      // 7. Delete magic links associated with the email
      await db.delete(magicLinks).where(eq(magicLinks.email, user.email));

      // 8. Finally delete the user
      await db.delete(users).where(eq(users.id, userId));

      console.log(
        `[Account Deletion] Successfully deleted account for user: ${userId}`,
      );

      return res.json({
        message: "Votre compte a été supprimé avec succès.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      return res.status(500).json({
        message: "Erreur lors de la suppression du compte.",
      });
    }
  },
);

/**
 * GET /api/profile/export
 * Export all user data for RGPD compliance.
 * Returns comprehensive data including profile, relationships, limits, and notifications.
 */
router.get(
  "/profile/export",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // 1. Get user profile
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return res.status(404).json({
          message: "Utilisateur non trouvé.",
        });
      }

      // 2. Get all relationships (both as inviter and invitee)
      const userRelationships = await db.query.relationships.findMany({
        where: or(
          eq(relationships.inviterId, userId),
          eq(relationships.inviteeId, userId),
        ),
      });

      // Get partner details for relationships
      const partnerIds = new Set<string>();
      userRelationships.forEach((rel) => {
        if (rel.inviterId === userId && rel.inviteeId) {
          partnerIds.add(rel.inviteeId);
        } else if (rel.inviterId !== userId) {
          partnerIds.add(rel.inviterId);
        }
      });

      const partners =
        partnerIds.size > 0
          ? await db.query.users.findMany({
              where: or(
                ...Array.from(partnerIds).map((id) => eq(users.id, id)),
              ),
            })
          : [];

      const partnerMap = new Map(partners.map((p) => [p.id, p]));

      // 3. Get all user limits
      const userLimitsData = await db.query.userLimits.findMany({
        where: eq(userLimits.userId, userId),
      });

      // Get limit details for all user limits
      const limitIds = [...new Set(userLimitsData.map((ul) => ul.limitId))];
      const limitDetails =
        limitIds.length > 0
          ? await db.query.limits.findMany({
              where: or(...limitIds.map((id) => eq(limits.id, id))),
            })
          : [];

      const limitMap = new Map(limitDetails.map((l) => [l.id, l]));

      // 4. Get all notifications
      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
      });

      // 5. Get blocked users
      const blockedUsersList = await db.query.blockedUsers.findMany({
        where: eq(blockedUsers.blockerId, userId),
      });

      // Prepare export data (only user's own data, no other users' private data)
      const exportData = {
        exportDate: new Date().toISOString(),
        profile: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        relationships: userRelationships.map((rel) => {
          const otherUserId =
            rel.inviterId === userId ? rel.inviteeId : rel.inviterId;
          const otherUser = otherUserId ? partnerMap.get(otherUserId) : null;

          return {
            id: rel.id,
            role: rel.inviterId === userId ? "inviter" : "invitee",
            otherUser: otherUser
              ? {
                  id: otherUser.id,
                  displayName: otherUser.displayName,
                }
              : null,
            status: rel.status,
            createdAt: rel.createdAt,
            updatedAt: rel.updatedAt,
          };
        }),
        limits: userLimitsData.map((ul) => {
          const limit = limitMap.get(ul.limitId);
          const relationship = userRelationships.find(
            (r) => r.id === ul.relationshipId,
          );

          return {
            limitId: ul.limitId,
            limitName: limit?.name || "Unknown",
            limitDescription: limit?.description || "",
            relationshipId: ul.relationshipId,
            relationshipStatus: relationship?.status || "unknown",
            isAccepted: ul.isAccepted,
            note: ul.note,
            createdAt: ul.createdAt,
            updatedAt: ul.updatedAt,
          };
        }),
        notifications: userNotifications.map((notif) => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          relatedUserId: notif.relatedUserId,
          relatedRelationshipId: notif.relatedRelationshipId,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
        })),
        blockedUsers: blockedUsersList.map((blocked) => ({
          blockedUserId: blocked.blockedId,
          blockedAt: blocked.createdAt,
        })),
      };

      return res.json(exportData);
    } catch (error) {
      console.error("Error exporting user data:", error);
      return res.status(500).json({
        message: "Erreur lors de l'export des données.",
      });
    }
  },
);

/**
 * GET /api/profile/notification-settings
 * Get the current user's notification email settings.
 */
router.get(
  "/profile/notification-settings",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const settings = await db.query.notificationEmailSettings.findFirst({
        where: eq(notificationEmailSettings.userId, userId),
      });

      return res.json({
        settings: {
          digestEnabled: settings?.digestEnabled ?? true,
          digestFrequency: settings?.digestFrequency ?? "daily",
          digestTime: settings?.digestTime ?? "08:00",
          digestWeeklyDay: settings?.digestWeeklyDay ?? 1,
          realtimeEnabled: settings?.realtimeEnabled ?? true,
        },
      });
    } catch (error) {
      console.error("Error getting notification settings:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des paramètres de notification.",
      });
    }
  },
);

/**
 * PUT /api/profile/notification-settings
 * Update the current user's notification email settings.
 */
router.put(
  "/profile/notification-settings",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const {
        digestEnabled,
        digestFrequency,
        digestTime,
        digestWeeklyDay,
        realtimeEnabled,
      } = req.body;

      // Validate digestFrequency
      const validFrequencies = ["daily", "weekly"];
      if (
        digestFrequency !== undefined &&
        !validFrequencies.includes(digestFrequency)
      ) {
        return res.status(400).json({
          message:
            "Fréquence du résumé invalide. Valeurs acceptées : daily, weekly.",
        });
      }

      // Validate digestTime
      if (digestTime !== undefined && !/^\d{2}:\d{2}$/.test(digestTime)) {
        return res.status(400).json({
          message: "L'heure doit être au format HH:MM.",
        });
      }

      // Validate digestWeeklyDay
      if (
        digestWeeklyDay !== undefined &&
        (typeof digestWeeklyDay !== "number" ||
          digestWeeklyDay < 0 ||
          digestWeeklyDay > 6)
      ) {
        return res.status(400).json({
          message:
            "Le jour du résumé hebdomadaire doit être un nombre entre 0 (dimanche) et 6 (samedi).",
        });
      }

      const nowStr = new Date().toISOString();
      const existing = await db.query.notificationEmailSettings.findFirst({
        where: eq(notificationEmailSettings.userId, userId),
      });

      if (existing) {
        await db
          .update(notificationEmailSettings)
          .set({
            ...(digestEnabled !== undefined && { digestEnabled }),
            ...(digestFrequency !== undefined && { digestFrequency }),
            ...(digestTime !== undefined && { digestTime }),
            ...(digestWeeklyDay !== undefined && { digestWeeklyDay }),
            ...(realtimeEnabled !== undefined && { realtimeEnabled }),
            updatedAt: nowStr,
          })
          .where(eq(notificationEmailSettings.userId, userId));
      } else {
        await db.insert(notificationEmailSettings).values({
          id: uuidv4(),
          userId,
          digestEnabled: digestEnabled ?? true,
          digestFrequency: digestFrequency ?? "daily",
          digestTime: digestTime ?? "08:00",
          digestWeeklyDay: digestWeeklyDay ?? 1,
          realtimeEnabled: realtimeEnabled ?? true,
          updatedAt: nowStr,
        });
      }

      const updated = await db.query.notificationEmailSettings.findFirst({
        where: eq(notificationEmailSettings.userId, userId),
      });

      return res.json({
        settings: {
          digestEnabled: updated?.digestEnabled ?? true,
          digestFrequency: updated?.digestFrequency ?? "daily",
          digestTime: updated?.digestTime ?? "08:00",
          digestWeeklyDay: updated?.digestWeeklyDay ?? 1,
          realtimeEnabled: updated?.realtimeEnabled ?? true,
        },
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      return res.status(500).json({
        message: "Erreur lors de la mise à jour des paramètres de notification.",
      });
    }
  },
);

export default router;
