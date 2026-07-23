/**
 * Signed session tokens using Web Crypto (HMAC-SHA256) so the same code runs in
 * Edge middleware and Node route handlers. Token = base64url(payload).base64url(sig).
 */

export const SESSION_COOKIE = "taify_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

interface Payload {
  exp: number; // ms epoch
}

const enc = new TextEncoder();

/** Copy into a fresh ArrayBuffer so Web Crypto accepts it as BufferSource. */
function toBuf(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(s: string): string {
  return b64urlEncode(enc.encode(s));
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBuf(enc.encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(secret: string): Promise<string> {
  const payload: Payload = { exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const payloadPart = b64urlEncodeStr(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, toBuf(enc.encode(payloadPart)));
  return `${payloadPart}.${b64urlEncode(sig)}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return false;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      toBuf(b64urlToBytes(sigPart)),
      toBuf(enc.encode(payloadPart)),
    );
    if (!ok) return false;
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payloadPart)),
    ) as Payload;
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
