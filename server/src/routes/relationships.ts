import { Router, Response } from "express";
import { db } from "../db/connection";
import { relationships, userLimits, limits, users, notifications } from "../db/schema";
import { eq, or, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/relationships
 * Get all relationships for the authenticated user, enriched with partner info.
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

      // Enrich with partner display names
      const enriched = await Promise.all(
        userRelationships.map(async (rel) => {
          const partnerId =
            rel.inviterId === userId ? rel.inviteeId : rel.inviterId;
          let partnerName = null;
          let partnerAvatarUrl = null;
          if (partnerId) {
            const partner = await db.query.users.findFirst({
              where: eq(users.id, partnerId),
            });
            if (partner) {
              partnerName = partner.displayName;
              partnerAvatarUrl = partner.avatarUrl;
            }
          }
          return {
            ...rel,
            partnerName,
            partnerAvatarUrl,
          };
        })
      );

      return res.json({
        success: true,
        data: enriched,
        count: enriched.length,
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
 * GET /api/relationships/invite/:token
 * Get invitation details by token (inviter's name, status).
 * Requires authentication.
 */
router.get(
  "/relationships/invite/:token",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      const userId = req.userId!;

      const relationship = await db.query.relationships.findFirst({
        where: eq(relationships.invitationToken, token),
      });

      if (!relationship) {
        return res.status(404).json({
          message: "Invitation non trouvée ou expirée.",
        });
      }

      // Check if user is the inviter (can't accept own invitation)
      if (relationship.inviterId === userId) {
        return res.status(400).json({
          message: "Vous ne pouvez pas accepter votre propre invitation.",
          isOwnInvitation: true,
        });
      }

      // Check if already accepted
      if (relationship.status === "accepted") {
        return res.status(400).json({
          message: "Cette invitation a déjà été acceptée.",
          alreadyAccepted: true,
        });
      }

      // Get inviter info
      const inviter = await db.query.users.findFirst({
        where: eq(users.id, relationship.inviterId),
      });

      return res.json({
        success: true,
        data: {
          id: relationship.id,
          inviterName: inviter?.displayName || "Utilisateur inconnu",
          inviterAvatarUrl: inviter?.avatarUrl || null,
          status: relationship.status,
          createdAt: relationship.createdAt,
        },
      });
    } catch (error) {
      console.error("Error fetching invitation:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération de l'invitation.",
      });
    }
  }
);

/**
 * POST /api/relationships/accept/:token
 * Accept a relationship invitation.
 * Sets inviteeId, changes status to 'accepted', creates notification for inviter.
 */
router.post(
  "/relationships/accept/:token",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      const userId = req.userId!;

      const relationship = await db.query.relationships.findFirst({
        where: eq(relationships.invitationToken, token),
      });

      if (!relationship) {
        return res.status(404).json({
          message: "Invitation non trouvée ou expirée.",
        });
      }

      // Can't accept own invitation
      if (relationship.inviterId === userId) {
        return res.status(400).json({
          message: "Vous ne pouvez pas accepter votre propre invitation.",
        });
      }

      // Can't accept if already accepted
      if (relationship.status === "accepted") {
        return res.status(400).json({
          message: "Cette invitation a déjà été acceptée.",
        });
      }

      // Check if already in a relationship with this person
      const existingRelationship = await db.query.relationships.findFirst({
        where: and(
          eq(relationships.status, "accepted"),
          or(
            and(
              eq(relationships.inviterId, relationship.inviterId),
              eq(relationships.inviteeId, userId)
            ),
            and(
              eq(relationships.inviterId, userId),
              eq(relationships.inviteeId, relationship.inviterId)
            )
          )
        ),
      });

      if (existingRelationship) {
        return res.status(400).json({
          message: "Vous avez déjà une relation avec cette personne.",
        });
      }

      // Accept the invitation
      await db
        .update(relationships)
        .set({
          inviteeId: userId,
          status: "accepted",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(relationships.id, relationship.id));

      // Get the accepting user's name for the notification
      const acceptingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      // Create notification for the inviter
      await db.insert(notifications).values({
        id: uuidv4(),
        userId: relationship.inviterId,
        type: "relation_accepted",
        title: "Invitation acceptée",
        message: `${acceptingUser?.displayName || "Un utilisateur"} a accepté votre invitation.`,
        relatedUserId: userId,
        relatedRelationshipId: relationship.id,
        isRead: false,
      });

      return res.json({
        success: true,
        data: {
          relationshipId: relationship.id,
          status: "accepted",
        },
        message: "Invitation acceptée avec succès !",
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      return res.status(500).json({
        message: "Erreur lors de l'acceptation de l'invitation.",
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

/**
 * PUT /api/relationships/:id/limits
 * Set/update limits for the authenticated user in a specific relationship.
 * Body: { limits: [{ limitId: string, isAccepted: boolean, note?: string }] }
 * Only the user who is part of the relationship can update their own limits.
 */
router.put(
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
        return res.status(403).json({
          message: "Accès interdit. Vous ne faites pas partie de cette relation.",
        });
      }

      const { limits: limitUpdates } = req.body;

      if (!Array.isArray(limitUpdates)) {
        return res.status(400).json({
          message: "Format invalide. 'limits' doit être un tableau.",
        });
      }

      // Process each limit update
      for (const limitUpdate of limitUpdates) {
        const { limitId, isAccepted, note } = limitUpdate;

        if (!limitId || typeof isAccepted !== "boolean") {
          continue; // Skip invalid entries
        }

        // Verify the limit exists
        const limitExists = await db.query.limits.findFirst({
          where: eq(limits.id, limitId),
        });

        if (!limitExists) {
          continue; // Skip non-existent limits
        }

        // Check if user_limit already exists
        const existing = await db.query.userLimits.findFirst({
          where: and(
            eq(userLimits.userId, userId),
            eq(userLimits.relationshipId, relationshipId),
            eq(userLimits.limitId, limitId)
          ),
        });

        if (existing) {
          // Update existing
          await db
            .update(userLimits)
            .set({
              isAccepted,
              note: note || existing.note,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(userLimits.id, existing.id));
        } else {
          // Insert new
          await db.insert(userLimits).values({
            id: uuidv4(),
            userId,
            relationshipId,
            limitId,
            isAccepted,
            note: note || null,
          });
        }
      }

      // Return updated limits for this user only
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
        message: "Limites mises à jour avec succès.",
      });
    } catch (error) {
      console.error("Error updating relationship limits:", error);
      return res.status(500).json({
        message: "Erreur lors de la mise à jour des limites.",
      });
    }
  }
);

/**
 * GET /api/relationships/:id/common-limits
 * Get limits that BOTH users in the relationship have accepted.
 * This is the core privacy feature - only shows mutual matches.
 * A user who is NOT part of the relationship gets 403.
 */
router.get(
  "/relationships/:id/common-limits",
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
        return res.status(403).json({
          message: "Accès interdit. Vous ne faites pas partie de cette relation.",
        });
      }

      // Determine the other user in the relationship
      const otherUserId =
        relationship.inviterId === userId
          ? relationship.inviteeId
          : relationship.inviterId;

      if (!otherUserId) {
        return res.json({
          success: true,
          data: {
            relationshipId,
            commonLimits: [],
            count: 0,
          },
          message: "L'invitation n'a pas encore été acceptée.",
        });
      }

      // Get my accepted limits
      const myLimits = await db.query.userLimits.findMany({
        where: and(
          eq(userLimits.userId, userId),
          eq(userLimits.relationshipId, relationshipId),
          eq(userLimits.isAccepted, true)
        ),
      });

      // Get other user's accepted limits
      const otherLimits = await db.query.userLimits.findMany({
        where: and(
          eq(userLimits.userId, otherUserId),
          eq(userLimits.relationshipId, relationshipId),
          eq(userLimits.isAccepted, true)
        ),
      });

      // Find common limit IDs (both users accepted)
      const myLimitIds = new Set(myLimits.map((l) => l.limitId));
      const commonLimitIds = otherLimits
        .filter((l) => myLimitIds.has(l.limitId))
        .map((l) => l.limitId);

      // Get the actual limit details for common limits
      let commonLimitDetails: any[] = [];
      if (commonLimitIds.length > 0) {
        commonLimitDetails = await db.query.limits.findMany({
          where: inArray(limits.id, commonLimitIds),
        });
      }

      return res.json({
        success: true,
        data: {
          relationshipId,
          commonLimits: commonLimitDetails,
          count: commonLimitDetails.length,
        },
      });
    } catch (error) {
      console.error("Error fetching common limits:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des limites communes.",
      });
    }
  }
);

export default router;
