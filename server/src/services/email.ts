import { Resend } from "resend";

// ─── Types ─────────────────────────────────────────────────────────

export interface SendMagicLinkOptions {
  to: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  createdAt: string;
}

export interface SendNotificationDigestOptions {
  to: string;
  displayName: string;
  notifications: NotificationItem[];
  activitySummary?: ActivitySummary;
}

export interface ActivitySummary {
  newRelations: number;
  newCommonLimits: number;
  limitsRemoved: number;
  pendingRequests: number;
}

export interface SendRealtimeNotificationOptions {
  to: string;
  displayName: string;
  notifications: NotificationItem[];
}

export interface EmailProvider {
  sendMagicLink(options: SendMagicLinkOptions): Promise<void>;
  sendNotificationDigest(options: SendNotificationDigestOptions): Promise<void>;
  sendRealtimeNotification(
    options: SendRealtimeNotificationOptions,
  ): Promise<void>;
}

// ─── HTML Template ─────────────────────────────────────────────────

function buildMagicLinkHtml(
  magicLinkUrl: string,
  expiresInMinutes: number,
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre lien de connexion - Nos limites</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAF9; font-family: 'Nunito', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAFAF9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                Nos limites
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 14px; font-weight: 400;">
                Votre espace de confiance mutuelle
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1C1917; font-size: 20px; font-weight: 700;">
                Votre lien de connexion
              </h2>
              <p style="margin: 0 0 24px; color: #57534E; font-size: 15px; line-height: 1.6;">
                Vous avez demand&eacute; un lien magique pour vous connecter &agrave; <strong>Nos limites</strong>.
                Cliquez sur le bouton ci-dessous pour acc&eacute;der &agrave; votre compte&nbsp;:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${magicLinkUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 40px; border-radius: 12px; letter-spacing: 0.3px;">
                      Se connecter
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color: #FAF5FF; border-left: 4px solid #7C3AED; border-radius: 0 8px 8px 0; padding: 14px 18px;">
                    <p style="margin: 0; color: #6B21A8; font-size: 13px; line-height: 1.5;">
                      &#9202; Ce lien est valable <strong>${expiresInMinutes} minutes</strong> et ne peut &ecirc;tre utilis&eacute; qu'une seule fois.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin: 24px 0 0; color: #A8A29E; font-size: 12px; line-height: 1.5;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur&nbsp;:<br>
                <a href="${magicLinkUrl}" style="color: #7C3AED; word-break: break-all; text-decoration: underline;">${magicLinkUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F4; padding: 24px 40px; text-align: center; border-top: 1px solid #E7E5E4;">
              <p style="margin: 0 0 8px; color: #A8A29E; font-size: 12px; line-height: 1.5;">
                Vous recevez cet email car une connexion a &eacute;t&eacute; demand&eacute;e avec votre adresse.
              </p>
              <p style="margin: 0; color: #A8A29E; font-size: 12px; line-height: 1.5;">
                Si vous n'&ecirc;tes pas &agrave; l'origine de cette demande, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMagicLinkText(
  magicLinkUrl: string,
  expiresInMinutes: number,
): string {
  return [
    "Nos limites - Votre lien de connexion",
    "",
    "Vous avez demandé un lien magique pour vous connecter à Nos limites.",
    "Cliquez sur le lien ci-dessous pour accéder à votre compte :",
    "",
    magicLinkUrl,
    "",
    `Ce lien est valable ${expiresInMinutes} minutes et ne peut être utilisé qu'une seule fois.`,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
  ].join("\n");
}

// ─── Notification Digest Template ─────────────────────────────────

function buildActivitySummaryHtml(summary: ActivitySummary): string {
  const items: string[] = [];
  if (summary.newRelations > 0)
    items.push(
      `<td style="padding: 8px 12px; text-align: center;"><span style="font-size: 22px; font-weight: 700; color: #7C3AED;">${summary.newRelations}</span><br><span style="font-size: 11px; color: #57534E;">${summary.newRelations === 1 ? "Nouveau contact" : "Nouveaux contacts"}</span></td>`,
    );
  if (summary.newCommonLimits > 0)
    items.push(
      `<td style="padding: 8px 12px; text-align: center;"><span style="font-size: 22px; font-weight: 700; color: #059669;">${summary.newCommonLimits}</span><br><span style="font-size: 11px; color: #57534E;">${summary.newCommonLimits === 1 ? "Nouvelle limite commune" : "Nouvelles limites communes"}</span></td>`,
    );
  if (summary.limitsRemoved > 0)
    items.push(
      `<td style="padding: 8px 12px; text-align: center;"><span style="font-size: 22px; font-weight: 700; color: #DC2626;">${summary.limitsRemoved}</span><br><span style="font-size: 11px; color: #57534E;">${summary.limitsRemoved === 1 ? "Limite retirée" : "Limites retirées"}</span></td>`,
    );
  if (summary.pendingRequests > 0)
    items.push(
      `<td style="padding: 8px 12px; text-align: center;"><span style="font-size: 22px; font-weight: 700; color: #D97706;">${summary.pendingRequests}</span><br><span style="font-size: 11px; color: #57534E;">${summary.pendingRequests === 1 ? "Demande en attente" : "Demandes en attente"}</span></td>`,
    );
  if (items.length === 0) return "";
  return `
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.5px;">
                &#128202; Activit&eacute; r&eacute;cente
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF5FF; border-radius: 12px;">
                <tr>${items.join("")}</tr>
              </table>
            </td>
          </tr>`;
}

function buildNotificationDigestHtml(
  displayName: string,
  notificationItems: NotificationItem[],
  appUrl: string,
  activitySummary?: ActivitySummary,
): string {
  const notificationRows = notificationItems
    .map((n) => {
      const date = new Date(n.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
          <tr>
            <td style="padding: 16px; border-bottom: 1px solid #F5F5F4;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1C1917;">${n.title}</p>
              <p style="margin: 0 0 6px; font-size: 13px; color: #57534E; line-height: 1.5;">${n.message}</p>
              <p style="margin: 0; font-size: 11px; color: #A8A29E;">${date}</p>
            </td>
          </tr>`;
    })
    .join("");

  const count = notificationItems.length;
  const countLabel =
    count === 1 ? "1 notification non lue" : `${count} notifications non lues`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vos notifications - Nos limites</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAF9; font-family: 'Nunito', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAFAF9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                Nos limites
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 14px; font-weight: 400;">
                Votre espace de confiance mutuelle
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 24px;">
              <h2 style="margin: 0 0 8px; color: #1C1917; font-size: 20px; font-weight: 700;">
                Bonjour ${displayName}&nbsp;!
              </h2>
              <p style="margin: 0 0 24px; color: #57534E; font-size: 15px; line-height: 1.6;">
                Voici votre r&eacute;sum&eacute; avec <strong>${countLabel}</strong>.
              </p>
            </td>
          </tr>

          ${activitySummary ? buildActivitySummaryHtml(activitySummary) : ""}

          <!-- Notifications list -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E7E5E4; border-radius: 12px; overflow: hidden;">
                ${notificationRows}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${appUrl}/notifications" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 40px; border-radius: 12px; letter-spacing: 0.3px;">
                Voir mes notifications
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F4; padding: 24px 40px; text-align: center; border-top: 1px solid #E7E5E4;">
              <p style="margin: 0 0 8px; color: #A8A29E; font-size: 12px; line-height: 1.5;">
                Vous recevez cet email car vous avez des notifications non lues sur Nos limites.
              </p>
              <p style="margin: 0; color: #A8A29E; font-size: 12px; line-height: 1.5;">
                Vous pouvez modifier vos pr&eacute;f&eacute;rences de notification dans votre profil.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildNotificationDigestText(
  displayName: string,
  notificationItems: NotificationItem[],
  appUrl: string,
  activitySummary?: ActivitySummary,
): string {
  const count = notificationItems.length;
  const countLabel =
    count === 1 ? "1 notification non lue" : `${count} notifications non lues`;
  const lines = [
    "Nos limites - Votre résumé",
    "",
    `Bonjour ${displayName} !`,
    "",
    `Voici votre résumé avec ${countLabel}.`,
    "",
  ];

  if (activitySummary) {
    const { newRelations, newCommonLimits, limitsRemoved, pendingRequests } =
      activitySummary;
    const hasActivity =
      newRelations + newCommonLimits + limitsRemoved + pendingRequests > 0;
    if (hasActivity) {
      lines.push("--- Activité récente ---", "");
      if (newRelations > 0)
        lines.push(`  📇 ${newRelations} nouveau(x) contact(s)`);
      if (newCommonLimits > 0)
        lines.push(`  ✅ ${newCommonLimits} nouvelle(s) limite(s) commune(s)`);
      if (limitsRemoved > 0)
        lines.push(`  ❌ ${limitsRemoved} limite(s) retirée(s)`);
      if (pendingRequests > 0)
        lines.push(`  ⏳ ${pendingRequests} demande(s) en attente`);
      lines.push("");
    }
  }

  lines.push("--- Vos notifications ---", "");
  for (const n of notificationItems) {
    const date = new Date(n.createdAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    lines.push(`• ${n.title}`);
    lines.push(`  ${n.message}`);
    lines.push(`  ${date}`);
    lines.push("");
  }
  lines.push(`Voir vos notifications : ${appUrl}/notifications`);
  lines.push("");
  lines.push(
    "Vous pouvez modifier vos préférences de notification dans votre profil.",
  );
  return lines.join("\n");
}

// ─── Realtime Notification Template ───────────────────────────────

function buildRealtimeNotificationHtml(
  displayName: string,
  notificationItems: NotificationItem[],
  appUrl: string,
): string {
  const notificationRows = notificationItems
    .map((n) => {
      const date = new Date(n.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #F5F5F4;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1C1917;">${n.title}</p>
              <p style="margin: 0 0 4px; font-size: 13px; color: #57534E; line-height: 1.5;">${n.message}</p>
              <p style="margin: 0; font-size: 11px; color: #A8A29E;">${date}</p>
            </td>
          </tr>`;
    })
    .join("");

  const count = notificationItems.length;
  const subject =
    count === 1
      ? notificationItems[0].title
      : `${count} nouvelles notifications`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject} - Nos limites</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAF9; font-family: 'Nunito', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAFAF9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);">

          <!-- Header (compact) -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); padding: 20px 40px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                Nos limites
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px 16px;">
              <h2 style="margin: 0 0 8px; color: #1C1917; font-size: 18px; font-weight: 700;">
                ${displayName}, vous avez une mise &agrave; jour&nbsp;!
              </h2>
            </td>
          </tr>

          <!-- Notifications -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E7E5E4; border-radius: 12px; overflow: hidden;">
                ${notificationRows}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <a href="${appUrl}/notifications" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 12px 36px; border-radius: 12px; letter-spacing: 0.3px;">
                Voir dans l'app
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F4; padding: 20px 40px; text-align: center; border-top: 1px solid #E7E5E4;">
              <p style="margin: 0; color: #A8A29E; font-size: 12px; line-height: 1.5;">
                Vous pouvez d&eacute;sactiver ces alertes dans vos param&egrave;tres de notification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildRealtimeNotificationText(
  displayName: string,
  notificationItems: NotificationItem[],
  appUrl: string,
): string {
  const lines = [
    "Nos limites - Nouvelle notification",
    "",
    `${displayName}, vous avez une mise à jour !`,
    "",
  ];
  for (const n of notificationItems) {
    const date = new Date(n.createdAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    lines.push(`• ${n.title}`);
    lines.push(`  ${n.message}`);
    lines.push(`  ${date}`);
    lines.push("");
  }
  lines.push(`Voir dans l'app : ${appUrl}/notifications`);
  lines.push("");
  lines.push(
    "Vous pouvez désactiver ces alertes dans vos paramètres de notification.",
  );
  return lines.join("\n");
}

// ─── Console Provider (development fallback) ──────────────────────

class ConsoleEmailProvider implements EmailProvider {
  async sendMagicLink({
    to,
    magicLinkUrl,
    expiresInMinutes = 15,
  }: SendMagicLinkOptions): Promise<void> {
    console.log("\n========================================");
    console.log("  MAGIC LINK (console mode)");
    console.log("========================================");
    console.log(`  Email: ${to}`);
    console.log(`  Link:  ${magicLinkUrl}`);
    console.log(`  Expires in: ${expiresInMinutes} minutes`);
    console.log("========================================\n");
  }

  async sendNotificationDigest({
    to,
    displayName,
    notifications,
    activitySummary,
  }: SendNotificationDigestOptions): Promise<void> {
    console.log("\n========================================");
    console.log("  NOTIFICATION DIGEST (console mode)");
    console.log("========================================");
    console.log(`  Email: ${to}`);
    console.log(`  User: ${displayName}`);
    console.log(`  Unread notifications: ${notifications.length}`);
    if (activitySummary) {
      console.log(
        `  Activity: ${activitySummary.newRelations} new relations, ${activitySummary.newCommonLimits} new limits, ${activitySummary.limitsRemoved} removed, ${activitySummary.pendingRequests} pending`,
      );
    }
    notifications.forEach((n, i) => {
      console.log(`  [${i + 1}] ${n.title}: ${n.message}`);
    });
    console.log("========================================\n");
  }

  async sendRealtimeNotification({
    to,
    displayName,
    notifications,
  }: SendRealtimeNotificationOptions): Promise<void> {
    console.log("\n========================================");
    console.log("  REALTIME NOTIFICATION (console mode)");
    console.log("========================================");
    console.log(`  Email: ${to}`);
    console.log(`  User: ${displayName}`);
    console.log(`  Notifications: ${notifications.length}`);
    notifications.forEach((n, i) => {
      console.log(`  [${i + 1}] ${n.title}: ${n.message}`);
    });
    console.log("========================================\n");
  }
}

// ─── Resend Provider ──────────────────────────────────────────────

class ResendEmailProvider implements EmailProvider {
  private resend: Resend;
  private from: string;

  private replyTo: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is required when EMAIL_PROVIDER=resend. " +
          "Please set it in your .env file.",
      );
    }

    this.from =
      process.env.EMAIL_FROM || "Nos limites <notifications@no-limites.com>";
    this.replyTo = process.env.EMAIL_REPLY_TO || "support@no-limites.com";
    this.resend = new Resend(apiKey);
  }

  async sendMagicLink({
    to,
    magicLinkUrl,
    expiresInMinutes = 15,
  }: SendMagicLinkOptions): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      replyTo: this.replyTo,
      subject: "Votre lien de connexion - Nos limites",
      html: buildMagicLinkHtml(magicLinkUrl, expiresInMinutes),
      text: buildMagicLinkText(magicLinkUrl, expiresInMinutes),
    });

    if (error) {
      console.error("Resend email error:", error);
      throw new Error(`Failed to send magic link email: ${error.message}`);
    }

    console.log(`Magic link email sent to ${to} via Resend`);
  }

  async sendNotificationDigest({
    to,
    displayName,
    notifications,
    activitySummary,
  }: SendNotificationDigestOptions): Promise<void> {
    const appUrl = process.env.FRONTEND_URL || "https://app.no-limites.com";
    const count = notifications.length;
    const subject =
      count === 1
        ? "Votre résumé : 1 notification non lue - Nos limites"
        : `Votre résumé : ${count} notifications non lues - Nos limites`;
    const appUnsubscribeUrl = `${appUrl}/settings/notifications`;
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      replyTo: this.replyTo,
      subject,
      headers: {
        "List-Unsubscribe": `<${appUnsubscribeUrl}>, <mailto:${this.replyTo}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: buildNotificationDigestHtml(
        displayName,
        notifications,
        appUrl,
        activitySummary,
      ),
      text: buildNotificationDigestText(
        displayName,
        notifications,
        appUrl,
        activitySummary,
      ),
    });

    if (error) {
      console.error("Resend email error:", error);
      throw new Error(
        `Failed to send notification digest email: ${error.message}`,
      );
    }

    console.log(`Notification digest sent to ${to} via Resend`);
  }

  async sendRealtimeNotification({
    to,
    displayName,
    notifications,
  }: SendRealtimeNotificationOptions): Promise<void> {
    const appUrl = process.env.FRONTEND_URL || "https://app.no-limites.com";
    const count = notifications.length;
    const subject =
      count === 1
        ? `${notifications[0].title} - Nos limites`
        : `${count} nouvelles notifications - Nos limites`;
    const appUnsubscribeUrl = `${appUrl}/settings/notifications`;
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      replyTo: this.replyTo,
      subject,
      headers: {
        "List-Unsubscribe": `<${appUnsubscribeUrl}>, <mailto:${this.replyTo}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: buildRealtimeNotificationHtml(displayName, notifications, appUrl),
      text: buildRealtimeNotificationText(displayName, notifications, appUrl),
    });

    if (error) {
      console.error("Resend email error:", error);
      throw new Error(
        `Failed to send realtime notification email: ${error.message}`,
      );
    }

    console.log(`Realtime notification email sent to ${to} via Resend`);
  }
}

// ─── Factory ──────────────────────────────────────────────────────

function createEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();

  switch (provider) {
    case "resend":
      return new ResendEmailProvider();
    case "console":
      return new ConsoleEmailProvider();
    default:
      console.warn(
        `Unknown EMAIL_PROVIDER "${provider}", falling back to console.`,
      );
      return new ConsoleEmailProvider();
  }
}

// Singleton instance — created once at module load
export const emailService: EmailProvider = createEmailProvider();
