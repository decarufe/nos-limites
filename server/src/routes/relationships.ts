import { Router, Response } from "express";
import { db } from "../db/connection";
import {
  relationships,
  userLimits,
  limits,
  users,
  notifications,
  blockedUsers,
} from "../db/schema";
import { eq, or, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveFrontendBaseUrl } from "../utils/frontend-url";

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
        where: and(
          or(
            eq(relationships.inviterId, userId),
            eq(relationships.inviteeId, userId),
          ),
          eq(relationships.status, "accepted"),
        ),
      });

      // Collect all unique partner IDs
      const partnerIds = new Set<string>();
      userRelationships.forEach((rel) => {
        const partnerId =
          rel.inviterId === userId ? rel.inviteeId : rel.inviterId;
        if (partnerId) {
          partnerIds.add(partnerId);
        }
      });

      // Batch fetch all partners in a single query (performance optimization)
      const partners =
        partnerIds.size > 0
          ? await db.query.users.findMany({
              where: inArray(users.id, Array.from(partnerIds)),
            })
          : [];

      // Create a lookup map for O(1) access
      const partnerMap = new Map(
        partners.map((p) => [p.id, { name: p.displayName, avatarUrl: p.avatarUrl }]),
      );

      // Batch fetch common limits counts for all relationships
      const relationshipIds = userRelationships.map((r) => r.id);
      const allUserLimits = relationshipIds.length > 0
        ? await db.query.userLimits.findMany({
            where: and(
              inArray(userLimits.relationshipId, relationshipIds),
              eq(userLimits.isAccepted, true),
            ),
          })
        : [];

      // Calculate common limits count for each relationship
      const commonLimitsCounts = new Map<string, number>();

      for (const rel of userRelationships) {
        const partnerId =
          rel.inviterId === userId ? rel.inviteeId : rel.inviterId;

        if (!partnerId) {
          commonLimitsCounts.set(rel.id, 0);
          continue;
        }

        // Get my accepted limits for this relationship
        const myLimitIds = new Set(
          allUserLimits
            .filter((ul) => ul.userId === userId && ul.relationshipId === rel.id)
            .map((ul) => ul.limitId)
        );

        // Count partner's accepted limits that match mine
        const commonCount = allUserLimits.filter(
          (ul) =>
            ul.userId === partnerId &&
            ul.relationshipId === rel.id &&
            myLimitIds.has(ul.limitId)
        ).length;

        commonLimitsCounts.set(rel.id, commonCount);
      }

      // Enrich relationships with partner data and common limits count
      const enriched = userRelationships.map((rel) => {
        const partnerId =
          rel.inviterId === userId ? rel.inviteeId : rel.inviterId;
        const partnerData = partnerId ? partnerMap.get(partnerId) : null;
        return {
          ...rel,
          partnerName: partnerData?.name || null,
          partnerAvatarUrl: partnerData?.avatarUrl || null,
          commonLimitsCount: commonLimitsCounts.get(rel.id) || 0,
        };
      });

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
  },
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
          inviteUrl: `${resolveFrontendBaseUrl(req)}/invite/${invitationToken}`,
        },
        message: "Invitation créée avec succès.",
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      return res.status(500).json({
        message: "Erreur lors de la création de l'invitation.",
      });
    }
  },
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
  },
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

      // If already accepted, return success idempotently (prevent duplicate relationships)
      if (relationship.status === "accepted") {
        return res.json({
          success: true,
          data: {
            relationshipId: relationship.id,
            status: "accepted",
          },
          message: "Cette invitation a déjà été acceptée.",
        });
      }

      // Check if either user has blocked the other
      const isBlocked = await db.query.blockedUsers.findFirst({
        where: or(
          and(
            eq(blockedUsers.blockerId, userId),
            eq(blockedUsers.blockedId, relationship.inviterId),
          ),
          and(
            eq(blockedUsers.blockerId, relationship.inviterId),
            eq(blockedUsers.blockedId, userId),
          ),
        ),
      });

      if (isBlocked) {
        return res.status(403).json({
          message: "Impossible d'accepter cette invitation.",
        });
      }

      // Check if already in a relationship with this person
      const existingRelationship = await db.query.relationships.findFirst({
        where: and(
          eq(relationships.status, "accepted"),
          or(
            and(
              eq(relationships.inviterId, relationship.inviterId),
              eq(relationships.inviteeId, userId),
            ),
            and(
              eq(relationships.inviterId, userId),
              eq(relationships.inviteeId, relationship.inviterId),
            ),
          ),
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
  },
);

/**
 * POST /api/relationships/decline/:token
 * Decline a relationship invitation.
 * Changes status to 'declined' and optionally notifies the inviter.
 */
router.post(
  "/relationships/decline/:token",
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

      // Can't decline own invitation
      if (relationship.inviterId === userId) {
        return res.status(400).json({
          message: "Vous ne pouvez pas refuser votre propre invitation.",
        });
      }

      // Can't decline if already accepted
      if (relationship.status === "accepted") {
        return res.status(400).json({
          message: "Cette invitation a déjà été acceptée.",
        });
      }

      // Can't decline if already declined
      if (relationship.status === "declined") {
        return res.status(400).json({
          message: "Cette invitation a déjà été refusée.",
        });
      }

      // Update status to declined
      await db
        .update(relationships)
        .set({
          inviteeId: userId,
          status: "declined",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(relationships.id, relationship.id));

      // Optionally notify the inviter
      const decliningUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      await db.insert(notifications).values({
        id: uuidv4(),
        userId: relationship.inviterId,
        type: "relation_request",
        title: "Invitation refusée",
        message: `${decliningUser?.displayName || "Un utilisateur"} a refusé votre invitation.`,
        relatedUserId: userId,
        relatedRelationshipId: relationship.id,
        isRead: false,
      });

      return res.json({
        success: true,
        data: {
          relationshipId: relationship.id,
          status: "declined",
        },
        message: "Invitation refusée.",
      });
    } catch (error) {
      console.error("Error declining invitation:", error);
      return res.status(500).json({
        message: "Erreur lors du refus de l'invitation.",
      });
    }
  },
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
            eq(relationships.inviteeId, userId),
          ),
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
          eq(userLimits.relationshipId, relationshipId),
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
  },
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
            eq(relationships.inviteeId, userId),
          ),
        ),
      });

      if (!relationship) {
        return res.status(403).json({
          message:
            "Accès interdit. Vous ne faites pas partie de cette relation.",
        });
      }

      const { limits: limitUpdates } = req.body;

      if (!Array.isArray(limitUpdates)) {
        return res.status(400).json({
          message: "Format invalide. 'limits' doit être un tableau.",
        });
      }

      // Determine the other user in the relationship
      const otherUserId =
        relationship.inviterId === userId
          ? relationship.inviteeId
          : relationship.inviterId;

      // Track newly discovered common limits for notifications
      const newlyCommonLimits: string[] = [];
      // Track newly removed common limits for notifications
      const removedCommonLimits: string[] = [];

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
            eq(userLimits.limitId, limitId),
          ),
        });

        // Check if this removes a common limit
        if (!isAccepted && existing && existing.isAccepted && otherUserId) {
          // User is unchecking a previously accepted limit
          // Check if the other user still has it accepted (was common)
          const otherUserLimit = await db.query.userLimits.findFirst({
            where: and(
              eq(userLimits.userId, otherUserId),
              eq(userLimits.relationshipId, relationshipId),
              eq(userLimits.limitId, limitId),
              eq(userLimits.isAccepted, true),
            ),
          });

          // If other user still has it accepted, this was a common limit being removed
          if (otherUserLimit) {
            removedCommonLimits.push(limitId);
          }
        }

        // Check if this creates a new common limit
        if (isAccepted && otherUserId) {
          const otherUserLimit = await db.query.userLimits.findFirst({
            where: and(
              eq(userLimits.userId, otherUserId),
              eq(userLimits.relationshipId, relationshipId),
              eq(userLimits.limitId, limitId),
              eq(userLimits.isAccepted, true),
            ),
          });

          // If other user already accepted this limit, and this is a new acceptance
          if (otherUserLimit && (!existing || !existing.isAccepted)) {
            newlyCommonLimits.push(limitId);
          }
        }

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

      // Create notifications for newly discovered common limits
      if (newlyCommonLimits.length > 0 && otherUserId) {
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        for (const limitId of newlyCommonLimits) {
          const limit = await db.query.limits.findFirst({
            where: eq(limits.id, limitId),
          });

          // Notify the other user
          await db.insert(notifications).values({
            id: uuidv4(),
            userId: otherUserId,
            type: "new_common_limit",
            title: "Nouvelle limite commune découverte",
            message: `${currentUser?.displayName || "Un utilisateur"} a également coché "${limit?.name || "une limite"}". C'est maintenant une limite commune !`,
            relatedUserId: userId,
            relatedRelationshipId: relationshipId,
            isRead: false,
          });

          // Also notify the current user
          await db.insert(notifications).values({
            id: uuidv4(),
            userId: userId,
            type: "new_common_limit",
            title: "Nouvelle limite commune découverte",
            message: `Vous et votre partenaire avez tous deux coché "${limit?.name || "une limite"}". C'est maintenant une limite commune !`,
            relatedUserId: otherUserId,
            relatedRelationshipId: relationshipId,
            isRead: false,
          });
        }
      }

      // Create notifications for removed common limits
      if (removedCommonLimits.length > 0 && otherUserId) {
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        for (const limitId of removedCommonLimits) {
          const limit = await db.query.limits.findFirst({
            where: eq(limits.id, limitId),
          });

          // Notify the other user that a common limit was removed
          await db.insert(notifications).values({
            id: uuidv4(),
            userId: otherUserId,
            type: "limit_removed",
            title: "Limite commune retirée",
            message: `${currentUser?.displayName || "Un utilisateur"} a décoché "${limit?.name || "une limite"}". Cette limite n'est plus commune.`,
            relatedUserId: userId,
            relatedRelationshipId: relationshipId,
            isRead: false,
          });
        }
      }

      // Return updated limits for this user only
      const myLimits = await db.query.userLimits.findMany({
        where: and(
          eq(userLimits.userId, userId),
          eq(userLimits.relationshipId, relationshipId),
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
  },
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
            eq(relationships.inviteeId, userId),
          ),
        ),
      });

      if (!relationship) {
        return res.status(403).json({
          message:
            "Accès interdit. Vous ne faites pas partie de cette relation.",
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
          eq(userLimits.isAccepted, true),
        ),
      });

      // Get other user's accepted limits
      const otherLimits = await db.query.userLimits.findMany({
        where: and(
          eq(userLimits.userId, otherUserId),
          eq(userLimits.relationshipId, relationshipId),
          eq(userLimits.isAccepted, true),
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

        // Create a map of my notes for these limits
        const myNotesMap = new Map(
          myLimits
            .filter((ul) => ul.note)
            .map((ul) => [ul.limitId, ul.note])
        );

        // Enrich common limits with notes from the current user
        commonLimitDetails = commonLimitDetails.map((limit) => ({
          ...limit,
          note: myNotesMap.get(limit.id) || null,
        }));
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
  },
);

/**
 * PUT /api/relationships/:id/limits/:limitId/note
 * Add or update a note for a specific limit in a relationship.
 * Only the user who is part of the relationship can manage their own notes.
 */
router.put(
  "/relationships/:id/limits/:limitId/note",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const relationshipId = req.params.id;
      const limitId = req.params.limitId;
      const { note } = req.body;

      // Validate note
      if (!note || typeof note !== "string" || note.trim().length === 0) {
        return res.status(400).json({
          message: "La note ne peut pas être vide.",
        });
      }

      if (note.length > 500) {
        return res.status(400).json({
          message: "La note ne peut pas dépasser 500 caractères.",
        });
      }

      // Verify the user is part of this relationship
      const relationship = await db.query.relationships.findFirst({
        where: and(
          eq(relationships.id, relationshipId),
          or(
            eq(relationships.inviterId, userId),
            eq(relationships.inviteeId, userId),
          ),
        ),
      });

      if (!relationship) {
        return res.status(403).json({
          message:
            "Accès interdit. Vous ne faites pas partie de cette relation.",
        });
      }

      // Verify the limit exists
      const limitExists = await db.query.limits.findFirst({
        where: eq(limits.id, limitId),
      });

      if (!limitExists) {
        return res.status(404).json({
          message: "Limite non trouvée.",
        });
      }

      // Check if user_limit exists
      const existing = await db.query.userLimits.findFirst({
        where: and(
          eq(userLimits.userId, userId),
          eq(userLimits.relationshipId, relationshipId),
          eq(userLimits.limitId, limitId),
        ),
      });

      if (existing) {
        // Update existing note
        await db
          .update(userLimits)
          .set({
            note: note.trim(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userLimits.id, existing.id));
      } else {
        // Create new user_limit with note (limit not checked yet, but has a note)
        await db.insert(userLimits).values({
          id: uuidv4(),
          userId,
          relationshipId,
          limitId,
          isAccepted: false,
          note: note.trim(),
        });
      }

      return res.json({
        success: true,
        message: "Note ajoutée avec succès.",
      });
    } catch (error) {
      console.error("Error adding note to limit:", error);
      return res.status(500).json({
        message: "Erreur lors de l'ajout de la note.",
      });
    }
  },
);

/**
 * DELETE /api/relationships/:id/limits/:limitId/note
 * Delete a note from a specific limit in a relationship.
 * Only the user who is part of the relationship can delete their own notes.
 */
router.delete(
  "/relationships/:id/limits/:limitId/note",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const relationshipId = req.params.id;
      const limitId = req.params.limitId;

      // Verify the user is part of this relationship
      const relationship = await db.query.relationships.findFirst({
        where: and(
          eq(relationships.id, relationshipId),
          or(
            eq(relationships.inviterId, userId),
            eq(relationships.inviteeId, userId),
          ),
        ),
      });

      if (!relationship) {
        return res.status(403).json({
          message:
            "Accès interdit. Vous ne faites pas partie de cette relation.",
        });
      }

      // Find the user_limit
      const existing = await db.query.userLimits.findFirst({
        where: and(
          eq(userLimits.userId, userId),
          eq(userLimits.relationshipId, relationshipId),
          eq(userLimits.limitId, limitId),
        ),
      });

      if (!existing) {
        return res.status(404).json({
          message: "Note non trouvée.",
        });
      }

      // If the limit is not accepted and only has a note, delete the entire record
      // Otherwise, just clear the note field
      if (!existing.isAccepted) {
        await db.delete(userLimits).where(eq(userLimits.id, existing.id));
      } else {
        await db
          .update(userLimits)
          .set({
            note: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userLimits.id, existing.id));
      }

      return res.json({
        success: true,
        message: "Note supprimée avec succès.",
      });
    } catch (error) {
      console.error("Error deleting note from limit:", error);
      return res.status(500).json({
        message: "Erreur lors de la suppression de la note.",
      });
    }
  },
);

/**
 * DELETE /api/relationships/:id
 * Delete a relationship. Only a participant can delete it.
 * Removes associated user_limits and creates a notification for the other user.
 */
router.delete(
  "/relationships/:id",
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
            eq(relationships.inviteeId, userId),
          ),
        ),
      });

      if (!relationship) {
        return res.status(404).json({
          message: "Relation non trouvée.",
        });
      }

      // Determine the other user for notification
      const otherUserId =
        relationship.inviterId === userId
          ? relationship.inviteeId
          : relationship.inviterId;

      // Delete associated user_limits
      await db
        .delete(userLimits)
        .where(eq(userLimits.relationshipId, relationshipId));

      // Clear relatedRelationshipId in notifications before deleting relationship
      await db
        .update(notifications)
        .set({ relatedRelationshipId: null })
        .where(eq(notifications.relatedRelationshipId, relationshipId));

      // Delete the relationship
      await db
        .delete(relationships)
        .where(eq(relationships.id, relationshipId));

      // Notify the other user (if they exist)
      if (otherUserId) {
        const deletingUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        await db.insert(notifications).values({
          id: uuidv4(),
          userId: otherUserId,
          type: "relation_deleted",
          title: "Relation supprimée",
          message: `${deletingUser?.displayName || "Un utilisateur"} a supprimé la relation.`,
          relatedUserId: userId,
        });
      }

      return res.json({
        success: true,
        message: "Relation supprimée avec succès.",
      });
    } catch (error) {
      console.error("Error deleting relationship:", error);
      return res.status(500).json({
        message: "Erreur lors de la suppression de la relation.",
      });
    }
  },
);

/**
 * POST /api/relationships/:id/block
 * Block a user. This removes the existing relationship and prevents future invitations.
 * Only a participant in the relationship can block.
 */
router.post(
  "/relationships/:id/block",
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
            eq(relationships.inviteeId, userId),
          ),
        ),
      });

      if (!relationship) {
        return res.status(404).json({
          message: "Relation non trouvée.",
        });
      }

      // Determine the other user (the one being blocked)
      const blockedUserId =
        relationship.inviterId === userId
          ? relationship.inviteeId
          : relationship.inviterId;

      if (!blockedUserId) {
        return res.status(400).json({
          message: "Impossible de bloquer un utilisateur inexistant.",
        });
      }

      // Check if already blocked
      const existingBlock = await db.query.blockedUsers.findFirst({
        where: and(
          eq(blockedUsers.blockerId, userId),
          eq(blockedUsers.blockedId, blockedUserId),
        ),
      });

      if (existingBlock) {
        return res.status(400).json({
          message: "Cet utilisateur est déjà bloqué.",
        });
      }

      // Delete associated user_limits
      await db
        .delete(userLimits)
        .where(eq(userLimits.relationshipId, relationshipId));

      // Clear relatedRelationshipId in notifications before deleting relationship
      await db
        .update(notifications)
        .set({ relatedRelationshipId: null })
        .where(eq(notifications.relatedRelationshipId, relationshipId));

      // Delete the relationship
      await db
        .delete(relationships)
        .where(eq(relationships.id, relationshipId));

      // Add to blocked_users table
      await db.insert(blockedUsers).values({
        id: uuidv4(),
        blockerId: userId,
        blockedId: blockedUserId,
      });

      // Notify the blocked user (optional, but good for transparency)
      const blockingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      await db.insert(notifications).values({
        id: uuidv4(),
        userId: blockedUserId,
        type: "relation_deleted",
        title: "Relation supprimée",
        message: `${blockingUser?.displayName || "Un utilisateur"} a supprimé la relation.`,
        relatedUserId: userId,
      });

      return res.json({
        success: true,
        message: "Utilisateur bloqué avec succès.",
      });
    } catch (error) {
      console.error("Error blocking user:", error);
      return res.status(500).json({
        message: "Erreur lors du blocage de l'utilisateur.",
      });
    }
  },
);

export default router;
