import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { db } from "../db/connection";
import { devices, sessions } from "../db/schema";

const DEVICE_TOKEN_EXPIRY_DAYS = 365;
const MAX_DEVICES_PER_USER = 10;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(token)
    .digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export async function createDeviceToken(
  userId: string,
  deviceName?: string,
): Promise<{ deviceId: string; deviceToken: string }> {
  // Enforce max devices — count only non-revoked
  const existing = await db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, userId), eq(devices.revoked, false)));

  if (existing.length >= MAX_DEVICES_PER_USER) {
    // Evict the oldest device (by lastSeen)
    const oldest = existing.sort(
      (a, b) => new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime(),
    )[0];
    await db
      .update(devices)
      .set({ revoked: true })
      .where(eq(devices.id, oldest.id));
  }

  const deviceId = uuidv4();
  const deviceToken = generateToken();
  const tokenHash = hashToken(deviceToken);
  const expiresAt = new Date(
    Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db.insert(devices).values({
    id: deviceId,
    userId,
    deviceName: deviceName || "Navigateur",
    refreshTokenHash: tokenHash,
    expiresAt,
  });

  return { deviceId, deviceToken };
}

/**
 * Verify a device token and issue a new JWT session.
 * Implements token rotation: old token is invalidated, new one issued.
 */
export async function refreshDeviceToken(
  deviceId: string,
  oldToken: string,
): Promise<{
  jwtToken: string;
  deviceToken: string;
  userId: string;
}> {
  const oldHash = hashToken(oldToken);

  const [device] = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.id, deviceId),
        eq(devices.refreshTokenHash, oldHash),
        eq(devices.revoked, false),
      ),
    );

  if (!device) {
    throw new Error("Invalid or revoked device token");
  }

  if (new Date(device.expiresAt) < new Date()) {
    await db
      .update(devices)
      .set({ revoked: true })
      .where(eq(devices.id, deviceId));
    throw new Error("Device token expired");
  }

  // Rotate: generate new device token
  const newDeviceToken = generateToken();
  const newHash = hashToken(newDeviceToken);
  const newExpiresAt = new Date(
    Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db
    .update(devices)
    .set({
      refreshTokenHash: newHash,
      lastSeen: new Date().toISOString(),
      expiresAt: newExpiresAt,
    })
    .where(eq(devices.id, deviceId));

  // Create a new JWT session
  const jwtToken = jwt.sign({ userId: device.userId }, JWT_SECRET, {
    expiresIn: "30d",
  });

  const sessionId = uuidv4();
  const sessionExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db.insert(sessions).values({
    id: sessionId,
    userId: device.userId,
    token: jwtToken,
    expiresAt: sessionExpiresAt,
  });

  return {
    jwtToken,
    deviceToken: newDeviceToken,
    userId: device.userId,
  };
}

export async function revokeDevice(
  deviceId: string,
  userId: string,
): Promise<void> {
  await db
    .update(devices)
    .set({ revoked: true })
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
}

export async function getUserDevices(userId: string) {
  return db
    .select({
      id: devices.id,
      deviceName: devices.deviceName,
      createdAt: devices.createdAt,
      lastSeen: devices.lastSeen,
      revoked: devices.revoked,
    })
    .from(devices)
    .where(eq(devices.userId, userId));
}

export async function renameDevice(
  deviceId: string,
  userId: string,
  newName: string,
): Promise<void> {
  await db
    .update(devices)
    .set({ deviceName: newName })
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
}
