import { Router, Response } from "express";
import { db } from "../db/connection";
import { notifications, notificationEmailSettings } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user.
 */
router.get(
  "/notifications",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: [desc(notifications.createdAt)],
      });

      return res.json({
        success: true,
        data: userNotifications,
        count: userNotifications.length,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des notifications.",
      });
    }
  }
);

/**
 * PUT /api/notifications/:id/read
 * Mark a specific notification as read.
 */
router.put(
  "/notifications/:id/read",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;

      // Verify the notification belongs to the user
      const notification = await db.query.notifications.findFirst({
        where: eq(notifications.id, notificationId),
      });

      if (!notification) {
        return res.status(404).json({
          message: "Notification non trouvée.",
        });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({
          message: "Accès interdit.",
        });
      }

      // Update the notification
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

      return res.json({
        success: true,
        message: "Notification marquée comme lue.",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({
        message: "Erreur lors de la mise à jour de la notification.",
      });
    }
  }
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
router.put(
  "/notifications/read-all",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // Update all unread notifications for this user
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      return res.json({
        success: true,
        message: "Toutes les notifications ont été marquées comme lues.",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res.status(500).json({
        message: "Erreur lors de la mise à jour des notifications.",
      });
    }
  }
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
        message:
          "Erreur lors de la récupération des paramètres de notification.",
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
        message:
          "Erreur lors de la mise à jour des paramètres de notification.",
      });
    }
  },
);

export default router;
