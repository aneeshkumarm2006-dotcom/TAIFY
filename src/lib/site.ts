// Canonical site config for SEO. Override SITE_URL via NEXT_PUBLIC_SITE_URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://taify.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "TAIFY";
export const SITE_TAGLINE = "There's An AI For You";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
