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

export default router;
