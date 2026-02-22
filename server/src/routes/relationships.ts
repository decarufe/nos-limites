import { Router, Response } from "express";
import { db } from "../db/connection";
import { relationships, userLimits } from "../db/schema";
import { eq, or, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/relationships
 * Get all relationships for the authenticated user.
 */
router.get(
  "/relationships",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const userRelationships = await db.query.relationships.findMany({
        where: or(
          eq(relationships.inviterId, userId),
          eq(relationships.inviteeId, userId)
        ),
      });

      return res.json({
        success: true,
        data: userRelationships,
        count: userRelationships.length,
      });
    } catch (error) {
      console.error("Error fetching relationships:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des relations.",
      });
    }
  }
);

/**
 * POST /api/relationships/invite
 * Create a new relationship invitation.
 */
router.post(
  "/relationships/invite",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const invitationToken = uuidv4();
      const relationshipId = uuidv4();

      await db.insert(relationships).values({
        id: relationshipId,
        inviterId: userId,
        invitationToken,
        status: "pending",
      });

      return res.status(201).json({
        success: true,
        data: {
          id: relationshipId,
          invitationToken,
          inviteUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/invite/${invitationToken}`,
        },
        message: "Invitation créée avec succès.",
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      return res.status(500).json({
        message: "Erreur lors de la création de l'invitation.",
      });
    }
  }
);

/**
 * GET /api/relationships/:id/limits
 * Get limits for a specific relationship (only common limits visible).
 */
router.get(
  "/relationships/:id/limits",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const relationshipId = req.params.id;

      // Verify the user is part of this relationship
      const relationship = await db.query.relationships.findFirst({
        where: and(
          eq(relationships.id, relationshipId),
          or(
            eq(relationships.inviterId, userId),
            eq(relationships.inviteeId, userId)
          )
        ),
      });

      if (!relationship) {
        return res.status(404).json({
          message: "Relation non trouvée.",
        });
      }

      // Get user's own limits for this relationship
      const myLimits = await db.query.userLimits.findMany({
        where: and(
          eq(userLimits.userId, userId),
          eq(userLimits.relationshipId, relationshipId)
        ),
      });

      return res.json({
        success: true,
        data: {
          relationshipId,
          limits: myLimits,
        },
      });
    } catch (error) {
      console.error("Error fetching relationship limits:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des limites.",
      });
    }
  }
);

export default router;
