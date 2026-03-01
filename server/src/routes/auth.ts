import { Router, Request, Response } from "express";
import { db } from "../db/connection";
import { users, magicLinks, sessions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveFrontendBaseUrl } from "../utils/frontend-url";
import { emailService } from "../services/email";
import {
  createDeviceToken,
  refreshDeviceToken,
} from "../services/deviceService";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

// Google OAuth configuration
// These are helper functions to read env vars at runtime (not module load time)
// to avoid ESM import hoisting issues where imports run before dotenv.config()
function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || "";
}
function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}
function getGoogleCallbackUrl(): string {
  return (
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3001/api/auth/google/callback"
  );
}

// OAuth state expiry in milliseconds (10 minutes)
const OAUTH_STATE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Generate a stateless CSRF state token for OAuth flows.
 * The token is a nonce + timestamp signed with HMAC-SHA256 so it can be
 * verified without server-side storage, making it safe for serverless envs.
 */
function generateOAuthState(): string {
  const nonce = crypto.randomBytes(32).toString("hex");
  const ts = Date.now().toString();
  const payload = `${nonce}.${ts}`;
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Validate an OAuth CSRF state token produced by generateOAuthState().
 * Returns true only when the signature is valid and the token has not expired.
 *
 * Note: this stateless approach does not prevent within-window replay of the
 * state token itself.  That is acceptable because Google's authorization code
 * (exchanged alongside the state) is single-use; replaying the state without a
 * valid, unused code gains the attacker nothing.
 */
function validateOAuthState(state: string): boolean {
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const payload = `${nonce}.${ts}`;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payload)
    .digest("hex");
  // Constant-time comparison to prevent timing attacks.
  // Buffer.from(hex) throws if the string is not valid hex, which can happen
  // when the state param is tampered with — catch and reject it.
  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expectedSig, "hex"),
      )
    ) {
      return false;
    }
  } catch {
    // Invalid hex in sig (malformed token) — reject it
    return false;
  }
  const createdAt = parseInt(ts, 10);
  if (isNaN(createdAt) || Date.now() - createdAt > OAUTH_STATE_EXPIRY_MS) {
    return false;
  }
  return true;
}

// Helper: check if Google OAuth credentials are configured
// Uses process.env directly to avoid ESM import hoisting issues with dotenv
function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  return !!(
    clientId &&
    clientId.trim() !== "" &&
    clientSecret &&
    clientSecret.trim() !== ""
  );
}

// Facebook OAuth configuration
function getFacebookAppId(): string {
  return process.env.FACEBOOK_APP_ID || "";
}
function getFacebookAppSecret(): string {
  return process.env.FACEBOOK_APP_SECRET || "";
}
function getFacebookCallbackUrl(): string {
  return (
    process.env.FACEBOOK_CALLBACK_URL ||
    "http://localhost:3001/api/auth/facebook/callback"
  );
}

function isFacebookOAuthConfigured(): boolean {
  const appId = process.env.FACEBOOK_APP_ID || "";
  const appSecret = process.env.FACEBOOK_APP_SECRET || "";
  return !!(
    appId &&
    appId.trim() !== "" &&
    appSecret &&
    appSecret.trim() !== ""
  );
}

/**
 * GET /api/auth/providers
 * Returns which authentication providers are available.
 * This is a public endpoint (no auth required).
 */
router.get("/auth/providers", (_req: Request, res: Response) => {
  return res.json({
    providers: {
      magic_link: true,
      google: isGoogleOAuthConfigured(),
      facebook: isFacebookOAuthConfigured(),
    },
  });
});

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow.
 * Returns 501 if Google OAuth is not configured.
 */
router.get("/auth/google", (_req: Request, res: Response) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(501).json({
      message:
        "L'authentification Google n'est pas configurée. Veuillez définir GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.",
      error: "google_oauth_not_configured",
    });
  }

  // Generate stateless HMAC-signed CSRF state token
  const state = generateOAuthState();
  const callbackUrl = getGoogleCallbackUrl();

  const clientId = getGoogleClientId();
  const scope = encodeURIComponent("openid email profile");
  const redirectUri = encodeURIComponent(callbackUrl);
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

  return res.redirect(googleAuthUrl);
});

/**
 * GET /api/auth/facebook
 * Initiates Facebook OAuth flow.
 * Returns 501 if Facebook OAuth is not configured.
 */
router.get("/auth/facebook", (_req: Request, res: Response) => {
  if (!isFacebookOAuthConfigured()) {
    return res.status(501).json({
      message:
        "L'authentification Facebook n'est pas configurée. Veuillez définir FACEBOOK_APP_ID et FACEBOOK_APP_SECRET.",
      error: "facebook_oauth_not_configured",
    });
  }

  const state = generateOAuthState();
  const appId = getFacebookAppId();
  const callbackUrl = getFacebookCallbackUrl();
  const redirectUri = encodeURIComponent(callbackUrl);
  const scope = encodeURIComponent("email,public_profile");
  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

  return res.redirect(fbAuthUrl);
});

// ============================================================
// Facebook OAuth Callback
// ============================================================

/**
 * GET /api/auth/facebook/callback
 * Handles the OAuth callback from Facebook.
 * - Validates the CSRF state parameter
 * - Exchanges the authorization code for an access token
 * - Fetches user profile from the Graph API
 * - Creates or updates the user account and issues a session
 */
router.get("/auth/facebook/callback", async (req: Request, res: Response) => {
  const frontendUrl = resolveFrontendBaseUrl(req);

  try {
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth errors from Facebook (user denied, etc.)
    if (oauthError) {
      console.error(`[Facebook OAuth] Error from Facebook: ${oauthError}`);
      return res.redirect(`${frontendUrl}/login?error=facebook_denied`);
    }

    if (!code || typeof code !== "string") {
      console.error("[Facebook OAuth] Missing authorization code");
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    if (!state || typeof state !== "string") {
      console.error("[Facebook OAuth] Missing state parameter");
      return res.redirect(`${frontendUrl}/login?error=missing_state`);
    }

    // Validate CSRF state
    if (!validateOAuthState(state)) {
      console.error("[Facebook OAuth] Invalid or expired state parameter");
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    // Exchange authorization code for an access token
    const appId = getFacebookAppId();
    const appSecret = getFacebookAppSecret();
    const callbackUrl = getFacebookCallbackUrl();

    const tokenUrl = new URL(
      "https://graph.facebook.com/v19.0/oauth/access_token",
    );
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", callbackUrl);
    tokenUrl.searchParams.set("code", code);

    let accessToken: string;
    try {
      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: { message: string };
      };
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error?.message || "Token exchange failed");
      }
      accessToken = tokenData.access_token;
    } catch (err: any) {
      console.error(
        "[Facebook OAuth] Token exchange failed:",
        err?.message || err,
      );
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // Fetch user profile from Graph API
    const profileUrl = new URL("https://graph.facebook.com/v19.0/me");
    profileUrl.searchParams.set("fields", "id,name,email,picture.type(large)");
    profileUrl.searchParams.set("access_token", accessToken);

    let fbId: string;
    let fbName: string;
    let fbEmail: string | null;
    let fbPicture: string | null;
    try {
      const profileRes = await fetch(profileUrl.toString());
      const profileData = (await profileRes.json()) as {
        id?: string;
        name?: string;
        email?: string;
        picture?: { data?: { url?: string } };
        error?: { message: string };
      };
      if (!profileRes.ok || !profileData.id) {
        throw new Error(
          profileData.error?.message || "Failed to fetch profile",
        );
      }
      fbId = profileData.id;
      fbName = profileData.name || "Utilisateur Facebook";
      fbEmail = profileData.email?.toLowerCase().trim() || null;
      fbPicture = profileData.picture?.data?.url || null;
    } catch (err: any) {
      console.error(
        "[Facebook OAuth] Profile fetch failed:",
        err?.message || err,
      );
      return res.redirect(`${frontendUrl}/login?error=missing_user_info`);
    }

    console.log(
      `[Facebook OAuth] Verified user: ${fbEmail || fbId} (id: ${fbId})`,
    );

    // Find or create user — match on email if available, else on authProviderId
    let user = fbEmail
      ? await db.query.users.findFirst({ where: eq(users.email, fbEmail) })
      : await db.query.users.findFirst({
          where: eq(users.authProviderId, fbId),
        });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const userId = uuidv4();
      // Facebook may not provide email — use a placeholder so the NOT NULL constraint is satisfied
      const email = fbEmail || `fb_${fbId}@facebook.invalid`;
      await db.insert(users).values({
        id: userId,
        email,
        displayName: fbName,
        avatarUrl: fbPicture,
        authProvider: "facebook",
        authProviderId: fbId,
      });
      user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    } else if (user.authProvider !== "facebook") {
      await db
        .update(users)
        .set({
          authProvider: "facebook",
          authProviderId: fbId,
          avatarUrl: user.avatarUrl || fbPicture,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));
      user = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    } else {
      await db
        .update(users)
        .set({
          authProviderId: fbId,
          avatarUrl: fbPicture || user.avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));
    }

    if (!user) {
      console.error("[Facebook OAuth] Failed to create/find user");
      return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
    }

    // Create JWT session
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token: jwtToken,
      expiresAt: sessionExpiresAt,
    });

    const device = await createDeviceToken(
      user.id,
      req.headers["user-agent"]?.substring(0, 120) || "Facebook OAuth",
    );

    const authData = encodeURIComponent(
      JSON.stringify({
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        isNewUser,
        deviceId: device.deviceId,
        deviceToken: device.deviceToken,
      }),
    );

    return res.redirect(`${frontendUrl}/auth/oauth-callback?data=${authData}`);
  } catch (error) {
    console.error("[Facebook OAuth] Unexpected error in callback:", error);
    return res.redirect(`${frontendUrl}/login?error=oauth_error`);
  }
});

/**
 * POST /api/auth/magic-link
 * Send a magic link to the user's email.
 * In development mode, the link is logged to the console.
 */
router.post("/auth/magic-link", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Adresse email requise.",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Adresse email invalide.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate magic link token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Check for an existing unused, non-expired magic link for this email
    const existingLink = await db.query.magicLinks.findFirst({
      where: and(
        eq(magicLinks.email, normalizedEmail),
        eq(magicLinks.used, false),
      ),
    });

    if (existingLink && new Date(existingLink.expiresAt) > new Date()) {
      // Reuse existing record: update token and expiration
      await db
        .update(magicLinks)
        .set({ token, expiresAt })
        .where(eq(magicLinks.id, existingLink.id));
    } else {
      // No reusable link found — insert a new record
      await db.insert(magicLinks).values({
        id: uuidv4(),
        email: normalizedEmail,
        token,
        expiresAt,
        used: false,
      });
    }

    // Build magic link URL
    const magicLinkBaseUrl = resolveFrontendBaseUrl(req, {
      preferredBaseUrl: process.env.MAGIC_LINK_BASE_URL,
    });
    const magicLinkUrl = `${magicLinkBaseUrl}/auth/verify?token=${token}`;

    // Send the magic link via configured email provider
    await emailService.sendMagicLink({
      to: normalizedEmail,
      magicLinkUrl,
      expiresInMinutes: 15,
    });

    return res.json({
      message:
        "Lien magique envoyé ! Vérifiez votre boîte mail (ou la console en mode développement).",
      // In dev mode, also return the token for easier testing
      ...(process.env.NODE_ENV === "development" && {
        token,
        url: magicLinkUrl,
      }),
    });
  } catch (error) {
    console.error("Error sending magic link:", error);
    return res.status(500).json({
      message: "Erreur lors de l'envoi du lien magique.",
    });
  }
});

/**
 * GET /api/auth/verify?token=xxx
 * Verify a magic link token and create/login the user.
 */
router.get("/auth/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        message: "Token manquant.",
      });
    }

    // Find the magic link
    const magicLink = await db.query.magicLinks.findFirst({
      where: eq(magicLinks.token, token),
    });

    if (!magicLink) {
      return res.status(404).json({
        message: "Lien magique invalide ou expiré.",
      });
    }

    // Check if already used
    if (magicLink.used) {
      return res.status(400).json({
        message: "Ce lien magique a déjà été utilisé.",
      });
    }

    // Check expiration
    if (new Date(magicLink.expiresAt) < new Date()) {
      return res.status(400).json({
        message: "Ce lien magique a expiré. Veuillez en demander un nouveau.",
      });
    }

    // Mark magic link as used
    await db
      .update(magicLinks)
      .set({ used: true })
      .where(eq(magicLinks.id, magicLink.id));

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, magicLink.email),
    });

    let isNewUser = false;

    if (!user) {
      // Create new user with temporary display name
      isNewUser = true;
      const userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        email: magicLink.email,
        displayName: magicLink.email.split("@")[0], // Temporary name
        authProvider: "magic_link",
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    }

    if (!user) {
      return res.status(500).json({
        message: "Erreur lors de la création du compte.",
      });
    }

    // Create JWT token — include user profile so /auth/session is stateless
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    // Create session
    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 30 days

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token: jwtToken,
      expiresAt: sessionExpiresAt,
    });

    // Always register a device token for persistent sessions
    const device = await createDeviceToken(
      user.id,
      req.headers["user-agent"]?.substring(0, 120) || "Navigateur",
    );

    return res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      isNewUser,
      deviceId: device.deviceId,
      deviceToken: device.deviceToken,
    });
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({
      message: "Erreur lors de la vérification du lien magique.",
    });
  }
});

/**
 * POST /api/auth/device/refresh
 * Refresh an expired session using a long-lived device token.
 * Returns a new JWT, new device token (rotation), and user info.
 */
router.post("/auth/device/refresh", async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceToken } = req.body;

    if (
      !deviceId ||
      !deviceToken ||
      typeof deviceId !== "string" ||
      typeof deviceToken !== "string"
    ) {
      return res.status(400).json({
        message: "Device ID et token requis.",
      });
    }

    const result = await refreshDeviceToken(deviceId, deviceToken);

    // Fetch user info for the response
    const user = await db.query.users.findFirst({
      where: eq(users.id, result.userId),
    });

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur non trouvé.",
      });
    }

    return res.json({
      token: result.jwtToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      deviceId,
      deviceToken: result.deviceToken,
    });
  } catch (error: any) {
    console.error("Device refresh failed:", error?.message);
    return res.status(401).json({
      message: "Session d'appareil invalide ou expirée.",
    });
  }
});

/**
 * GET /api/auth/session
 * Check current session and return user info.
 * Tries DB first for freshest data; falls back to JWT claims on cold-start
 * Lambda where the ephemeral SQLite is empty.
 */
router.get(
  "/auth/session",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      // Attempt DB lookup for up-to-date profile (name/avatar may have changed)
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, req.userId!),
        });
        if (user) {
          return res.json({
            user: {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            },
          });
        }
      } catch {
        // DB unavailable — fall through to JWT claims
      }

      // Fall back to claims embedded in the JWT (works on ephemeral/cold DBs)
      if (req.userClaims) {
        return res.json({
          user: {
            id: req.userId!,
            ...req.userClaims,
          },
        });
      }

      // Neither DB nor claims available — token was issued in old format
      return res.status(401).json({
        message: "Session invalide. Veuillez vous reconnecter.",
      });
    } catch (error) {
      console.error("Error checking session:", error);
      return res.status(500).json({
        message: "Erreur lors de la vérification de la session.",
      });
    }
  },
);

/**
 * POST /api/auth/logout
 * Logout the current user by invalidating their session.
 */
router.post(
  "/auth/logout",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];

      if (token) {
        await db.delete(sessions).where(eq(sessions.token, token));
      }

      return res.json({
        message: "Déconnexion réussie.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      return res.status(500).json({
        message: "Erreur lors de la déconnexion.",
      });
    }
  },
);

// ============================================================
// Google OAuth Callback (Features #78 & #79)
// ============================================================

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google.
 * - Validates the CSRF state parameter (Feature #78)
 * - Exchanges the authorization code for tokens (Feature #78)
 * - Verifies the ID token and extracts user profile (Feature #79)
 * - Creates or updates the user account and issues a session
 */
router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const frontendUrl = resolveFrontendBaseUrl(req);

  try {
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth errors from Google (user denied, etc.)
    if (oauthError) {
      console.error(`[Google OAuth] Error from Google: ${oauthError}`);
      return res.redirect(`${frontendUrl}/login?error=google_denied`);
    }

    // Validate required parameters
    if (!code || typeof code !== "string") {
      console.error("[Google OAuth] Missing authorization code");
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    if (!state || typeof state !== "string") {
      console.error("[Google OAuth] Missing state parameter");
      return res.redirect(`${frontendUrl}/login?error=missing_state`);
    }

    // Feature #78: Validate the CSRF state parameter
    if (!validateOAuthState(state)) {
      console.error("[Google OAuth] Invalid or expired state parameter");
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    // Feature #78: Exchange authorization code for tokens
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    const callbackUrl = getGoogleCallbackUrl();
    const oauth2Client = new OAuth2Client(clientId, clientSecret, callbackUrl);

    let tokenResponse;
    try {
      tokenResponse = await oauth2Client.getToken(code);
    } catch (tokenError: any) {
      console.error(
        "[Google OAuth] Token exchange failed:",
        tokenError?.message || tokenError,
      );
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const { id_token } = tokenResponse.tokens;

    if (!id_token) {
      console.error("[Google OAuth] No ID token received from Google");
      return res.redirect(`${frontendUrl}/login?error=no_id_token`);
    }

    console.log(
      `[Google OAuth] Token exchange successful, verifying ID token...`,
    );

    // Feature #79: Verify the ID token and extract user profile
    let ticket;
    try {
      ticket = await oauth2Client.verifyIdToken({
        idToken: id_token,
        audience: clientId,
      });
    } catch (verifyError: any) {
      console.error(
        "[Google OAuth] ID token verification failed:",
        verifyError?.message || verifyError,
      );
      return res.redirect(
        `${frontendUrl}/login?error=token_verification_failed`,
      );
    }

    const payload = ticket.getPayload();
    if (!payload) {
      console.error("[Google OAuth] No payload in verified ID token");
      return res.redirect(`${frontendUrl}/login?error=invalid_token_payload`);
    }

    // Feature #79: Validate issuer
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      console.error(`[Google OAuth] Invalid issuer: ${payload.iss}`);
      return res.redirect(`${frontendUrl}/login?error=invalid_issuer`);
    }

    // Feature #79: Validate audience
    if (payload.aud !== clientId) {
      console.error(`[Google OAuth] Invalid audience: ${payload.aud}`);
      return res.redirect(`${frontendUrl}/login?error=invalid_audience`);
    }

    // Feature #79: Reject unverified emails
    if (!payload.email_verified) {
      console.error("[Google OAuth] Email not verified by Google");
      return res.redirect(`${frontendUrl}/login?error=email_not_verified`);
    }

    // Feature #79: Extract user profile from verified token
    const googleSub = payload.sub; // Unique Google user ID
    const email = payload.email?.toLowerCase().trim();
    const name =
      payload.name || payload.given_name || email?.split("@")[0] || "User";
    const picture = payload.picture || null;

    if (!email || !googleSub) {
      console.error("[Google OAuth] Missing email or sub in token");
      return res.redirect(`${frontendUrl}/login?error=missing_user_info`);
    }

    console.log(`[Google OAuth] Verified user: ${email} (sub: ${googleSub})`);

    // Find or create user in database
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    let isNewUser = false;

    if (!user) {
      // Create new user from Google profile
      isNewUser = true;
      const userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        email,
        displayName: name,
        avatarUrl: picture,
        authProvider: "google",
        authProviderId: googleSub,
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    } else if (user.authProvider !== "google") {
      // User exists with different auth provider — update to link Google
      await db
        .update(users)
        .set({
          authProvider: "google",
          authProviderId: googleSub,
          avatarUrl: user.avatarUrl || picture,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));

      user = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });
    } else {
      // Existing Google user — update avatar and provider ID if changed
      await db
        .update(users)
        .set({
          authProviderId: googleSub,
          avatarUrl: picture || user.avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));
    }

    if (!user) {
      console.error("[Google OAuth] Failed to create/find user");
      return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
    }

    // Create JWT session — include user profile so /auth/session is stateless
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token: jwtToken,
      expiresAt: sessionExpiresAt,
    });

    // Register device token for persistent sessions
    const device = await createDeviceToken(
      user.id,
      req.headers["user-agent"]?.substring(0, 120) || "Google OAuth",
    );

    console.log(
      `[Google OAuth] Session created for user ${user.email} (isNew: ${isNewUser})`,
    );

    // Redirect to frontend with auth data as URL parameter
    // The frontend OAuthCallbackPage will read these and store them
    const authData = encodeURIComponent(
      JSON.stringify({
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        isNewUser,
        deviceId: device.deviceId,
        deviceToken: device.deviceToken,
      }),
    );

    return res.redirect(`${frontendUrl}/auth/oauth-callback?data=${authData}`);
  } catch (error) {
    console.error("[Google OAuth] Unexpected error in callback:", error);
    return res.redirect(`${frontendUrl}/login?error=oauth_error`);
  }
});

export default router;
