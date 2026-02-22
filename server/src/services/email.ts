import { Resend } from "resend";

// ─── Types ─────────────────────────────────────────────────────────

export interface SendMagicLinkOptions {
  to: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
}

export interface EmailProvider {
  sendMagicLink(options: SendMagicLinkOptions): Promise<void>;
}

// ─── HTML Template ─────────────────────────────────────────────────

function buildMagicLinkHtml(magicLinkUrl: string, expiresInMinutes: number): string {
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

function buildMagicLinkText(magicLinkUrl: string, expiresInMinutes: number): string {
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

// ─── Console Provider (development fallback) ──────────────────────

class ConsoleEmailProvider implements EmailProvider {
  async sendMagicLink({ to, magicLinkUrl, expiresInMinutes = 15 }: SendMagicLinkOptions): Promise<void> {
    console.log("\n========================================");
    console.log("  MAGIC LINK (console mode)");
    console.log("========================================");
    console.log(`  Email: ${to}`);
    console.log(`  Link:  ${magicLinkUrl}`);
    console.log(`  Expires in: ${expiresInMinutes} minutes`);
    console.log("========================================\n");
  }
}

// ─── Resend Provider ──────────────────────────────────────────────

class ResendEmailProvider implements EmailProvider {
  private resend: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is required when EMAIL_PROVIDER=resend. " +
        "Please set it in your .env file."
      );
    }

    this.from = process.env.EMAIL_FROM || "Nos limites <noreply@noslimites.app>";
    this.resend = new Resend(apiKey);
  }

  async sendMagicLink({ to, magicLinkUrl, expiresInMinutes = 15 }: SendMagicLinkOptions): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
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
        `Unknown EMAIL_PROVIDER "${provider}", falling back to console.`
      );
      return new ConsoleEmailProvider();
  }
}

// Singleton instance — created once at module load
export const emailService: EmailProvider = createEmailProvider();
