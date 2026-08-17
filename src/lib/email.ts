import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Owner notifications for public lead captures, sent over SMTP from our own
 * mailbox (Gmail / Google Workspace with an app password) - no third-party
 * sending service.
 *
 * Nothing in here throws. A missing password or an unreachable SMTP host must
 * never cost us a lead, so every failure is swallowed and reported through the
 * returned result instead. Because failures are silent by design, the admin
 * route at /api/admin/email-test exists to tell a working deploy apart from a
 * misconfigured one.
 */

export interface MailResult {
  ok: boolean;
  /** Set when we deliberately did nothing (no credentials, no recipients). */
  skipped?: string;
  error?: string;
  messageId?: string;
  recipients?: string[];
}

const DEFAULT_HOST = "smtp.gmail.com";
const DEFAULT_PORT = 465;

interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function readConfig(): MailConfig | null {
  const user = (process.env.SMTP_USER ?? "").trim();
  const pass = process.env.SMTP_PASS ?? "";
  if (!user || !pass) return null;

  const port = Number(process.env.SMTP_PORT) || DEFAULT_PORT;
  return {
    host: (process.env.SMTP_HOST ?? "").trim() || DEFAULT_HOST,
    port,
    user,
    // Google prints app passwords in four blocks of four; the spaces are
    // presentation only and are rejected on the wire.
    pass: pass.replace(/\s+/g, ""),
    from: (process.env.EMAIL_FROM ?? "").trim() || user,
  };
}

/**
 * Recipients, comma-separated. Trimmed, blanks dropped, de-duplicated so one
 * address listed twice does not get two copies.
 */
export function readRecipients(): string[] {
  const raw = process.env.LEADS_NOTIFY_EMAIL ?? "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const addr = part.trim();
    if (!addr) continue;
    const key = addr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }
  return out;
}

// Cached across invocations so a warm serverless instance reuses the pooled
// connection instead of re-doing the TLS and auth handshake on every lead.
const globalForMail = globalThis as unknown as {
  _mailTransport?: Transporter;
};

function getTransport(cfg: MailConfig): Transporter {
  if (!globalForMail._mailTransport) {
    globalForMail._mailTransport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
      // Bounded, so blocked egress fails in seconds rather than hanging the
      // request until the platform kills the whole function.
      connectionTimeout: 10_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    });
  }
  return globalForMail._mailTransport;
}

export interface LeadNotification {
  /** Subject line: names the lead type and its specifics. */
  subject: string;
  /** Heading shown above the fields in the HTML body. */
  heading: string;
  /** Every field captured for this source, in the order it was asked for. */
  fields: Array<{ label: string; value: string }>;
  /** Submitter's address, so hitting reply goes to them. */
  replyTo?: string;
}

/**
 * Email the owners about one public submission. Never throws - callers should
 * still await it (see the note in the capture routes) but can ignore the
 * result.
 */
export async function sendLeadNotification(
  lead: LeadNotification,
): Promise<MailResult> {
  const cfg = readConfig();
  if (!cfg) {
    return { ok: false, skipped: "SMTP_USER / SMTP_PASS not configured" };
  }

  const recipients = readRecipients();
  if (recipients.length === 0) {
    return { ok: false, skipped: "LEADS_NOTIFY_EMAIL is empty" };
  }

  const rows = lead.fields.filter((f) => f.value.trim().length > 0);

  try {
    const info = await getTransport(cfg).sendMail({
      from: cfg.from,
      to: recipients,
      replyTo: lead.replyTo || undefined,
      subject: lead.subject,
      text: textBody(lead.heading, rows),
      html: htmlBody(lead.heading, rows),
    });
    return { ok: true, messageId: info.messageId, recipients };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] lead notification failed:", error);
    return { ok: false, error, recipients };
  }
}

/**
 * Open the connection and authenticate without sending anything. Used by the
 * admin diagnostic route to prove credentials work.
 */
export async function verifyTransport(): Promise<MailResult> {
  const cfg = readConfig();
  if (!cfg) {
    return { ok: false, skipped: "SMTP_USER / SMTP_PASS not configured" };
  }
  try {
    await getTransport(cfg).verify();
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] transport verification failed:", error);
    return { ok: false, error };
  }
}

/** Send one real message to the configured recipients. Diagnostics only. */
export async function sendTestEmail(): Promise<MailResult> {
  return sendLeadNotification({
    subject: "TAIFY email test",
    heading: "SMTP test message",
    fields: [
      { label: "Result", value: "If you are reading this, notifications work." },
      { label: "Sent at", value: new Date().toUTCString() },
    ],
  });
}

/**
 * Config as it actually landed in the environment. The password is reported by
 * length only - enough to catch a value that arrived quoted or truncated,
 * without ever echoing the secret.
 */
export function describeMailConfig() {
  const rawPass = process.env.SMTP_PASS ?? "";
  const stripped = rawPass.replace(/\s+/g, "");
  return {
    host: (process.env.SMTP_HOST ?? "").trim() || `${DEFAULT_HOST} (default)`,
    port: Number(process.env.SMTP_PORT) || `${DEFAULT_PORT} (default)`,
    secure: (Number(process.env.SMTP_PORT) || DEFAULT_PORT) === 465,
    user: (process.env.SMTP_USER ?? "").trim() || null,
    from: (process.env.EMAIL_FROM ?? "").trim() || null,
    passSet: stripped.length > 0,
    passLength: stripped.length,
    passHadSpaces: rawPass.trim().length !== stripped.length,
    recipients: readRecipients(),
  };
}

// ---- Body rendering ----

function textBody(heading: string, rows: LeadNotification["fields"]): string {
  return [
    heading,
    "",
    ...rows.map((f) => `${f.label}: ${f.value}`),
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlBody(heading: string, rows: LeadNotification["fields"]): string {
  const cells = rows
    .map(
      (f) =>
        `<tr>` +
        `<td style="padding:6px 14px 6px 0;vertical-align:top;color:#666;white-space:nowrap;font-size:13px">${escapeHtml(f.label)}</td>` +
        `<td style="padding:6px 0;vertical-align:top;font-size:14px;white-space:pre-wrap">${escapeHtml(f.value)}</td>` +
        `</tr>`,
    )
    .join("");

  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111">` +
    `<h2 style="margin:0 0 14px;font-size:17px">${escapeHtml(heading)}</h2>` +
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${cells}</table>` +
    `</div>`
  );
}
