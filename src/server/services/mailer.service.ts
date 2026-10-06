import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email transport.
 *
 * Reads SMTP config from the environment. When SMTP isn't configured (e.g. local
 * dev), it falls back to logging the message so the whole flow still works
 * without a mail server. Set these in .env for real delivery (Gmail example):
 *
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=youraddress@gmail.com
 *   SMTP_PASS=your-16-char-app-password   # Google App Password, NOT your login
 *   MAIL_FROM="Otakademi <youraddress@gmail.com>"
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type MailResult = { ok: boolean; transport: string; error?: string };

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cached) return cached;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? "465");
  cached = nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS; otherwise STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

function fromAddress(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Otakademi <no-reply@otakademi.id>"
  );
}

/**
 * Sends an email. Never throws: returns ok:false on failure so callers can log
 * it without breaking the user's registration/payment flow.
 */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const transport = getTransport();

  // No SMTP configured -> log the message instead of silently dropping it.
  if (!transport) {
    console.info(
      `[mail:log] (SMTP belum dikonfigurasi) to=${msg.to} subject=${JSON.stringify(
        msg.subject,
      )}\n${msg.text}`,
    );
    return { ok: true, transport: "log" };
  }

  try {
    await transport.sendMail({
      from: fromAddress(),
      to: msg.to,
      replyTo: msg.replyTo,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      // Legitimate-sender signals that help keep the message out of spam.
      headers: {
        "List-Unsubscribe": `<mailto:${process.env.SMTP_USER ?? "no-reply@otakademi.id"}?subject=unsubscribe>`,
        "X-Entity-Ref-ID": "otakademi-ticket",
      },
    });
    return { ok: true, transport: "smtp" };
  } catch (err) {
    return {
      ok: false,
      transport: "smtp",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
