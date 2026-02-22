import { Router, Response } from "express";
import { db } from "../db/connection";
import { notifications } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

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

export default router;
