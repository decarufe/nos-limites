import { Router, Request, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  getUserDevices,
  revokeDevice,
  renameDevice,
} from "../services/deviceService";

const router = Router();

/**
 * GET /api/devices
 * List all devices for the authenticated user.
 */
router.get(
  "/devices",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const deviceList = await getUserDevices(req.userId!);
      return res.json({ devices: deviceList });
    } catch (error) {
      console.error("Error listing devices:", error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

/**
 * PUT /api/devices/:id
 * Rename a device.
 */
router.put(
  "/devices/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { deviceName } = req.body;
      if (!deviceName || typeof deviceName !== "string" || deviceName.trim().length === 0) {
        return res.status(400).json({ message: "Nom d'appareil requis." });
      }
      await renameDevice(req.params.id, req.userId!, deviceName.trim());
      return res.json({ success: true });
    } catch (error) {
      console.error("Error renaming device:", error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

/**
 * DELETE /api/devices/:id
 * Revoke a device.
 */
router.delete(
  "/devices/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      await revokeDevice(req.params.id, req.userId!);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error revoking device:", error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

export default router;
