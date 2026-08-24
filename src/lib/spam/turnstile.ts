import "server-only";

/**
 * Cloudflare Turnstile, wired as an env-var-only switch.
 *
 * Nothing changes until TURNSTILE_SECRET_KEY exists in the environment. With no
 * secret set, verifyTurnstile is a no-op that returns ok, the config endpoint
 * serves no site key, and the client never injects the widget - so this can
 * ship dark and be switched on later from the Vercel dashboard with no code
 * edit and no redeploy of anything but the env vars.
 *
 * This is the one part of the spam machinery that does NOT fail open. If the
 * secret is configured and the token cannot be verified, the submission is
 * refused. A CAPTCHA that waves everything through on a network error is not a
 * CAPTCHA, and unlike the content rules there is a person on the other end who
 * can simply try again.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True once the secret is present. The only switch. */
export function turnstileEnabled(): boolean {
  return Boolean((process.env.TURNSTILE_SECRET_KEY ?? "").trim());
}

/** Public site key, or null when the widget should not be shown at all. */
export function turnstileSiteKey(): string | null {
  const key = (process.env.TURNSTILE_SITE_KEY ?? "").trim();
  return key || null;
}

export interface TurnstileResult {
  ok: boolean;
  /** Cloudflare's own error codes, for the server log. Never shown to the user. */
  errors?: string[];
}

/**
 * Verify a token with Cloudflare. Tokens are single-use and expire after five
 * minutes, so the client resets the widget after every submit.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<TurnstileResult> {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) return { ok: true };

  if (!token) return { ok: false, errors: ["missing-input-response"] };

  const body = new URLSearchParams({ secret, response: token });
  // Cloudflare treats an unroutable address as absent rather than erroring, but
  // there is no point sending our own placeholder.
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success) return { ok: true };
    return { ok: false, errors: data["error-codes"] ?? ["verification-failed"] };
  } catch {
    return { ok: false, errors: ["network-error"] };
  }
}
