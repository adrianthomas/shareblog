import nodemailer from "nodemailer";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

/**
 * In development there's no mail transport configured, so codes/links are
 * logged to the console instead — auth is fully testable without SMTP setup.
 * In production this sends via Uberspace's own SMTP (or whatever SMTP_* is
 * configured), never a third-party email API — and never silently falls
 * back to logging: a production auth code sitting in a log file (which,
 * unlike an email, persists on disk indefinitely) is exactly the kind of
 * leak this exists to avoid, and a silent fallback would also mask the
 * misconfiguration instead of surfacing it.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n--- [dev email sink] ---\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n------------------------\n`,
    );
    return;
  }

  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is not set — cannot send auth email in production. See SELF_HOSTING.md.");
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? "Shareblog <noreply@localhost>",
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}
