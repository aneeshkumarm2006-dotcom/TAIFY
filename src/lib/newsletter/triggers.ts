/**
 * When the newsletter modal is allowed to appear, and when it must not.
 *
 * Every rule in this file is a decision about a URL, a counter, or a
 * timestamp, so none of it needs a browser or a database and all of it is
 * tested in triggers.test.ts. The hook in components/newsletter owns the
 * side effects — reading storage, running timers, listening for the mouse.
 *
 * The one thing to be careful with when changing anything here: the failure
 * that costs real money is showing the modal to someone who already told us
 * no. Getting a trigger slightly wrong loses one signup. Ignoring a
 * suppression record loses the visitor.
 */

/** Which rule opened the modal. Stored on the subscriber record. */
export type Trigger = "tools" | "dwell" | "exit";

// ── Storage keys ─────────────────────────────────────────────────────────────

/** localStorage. Survives the tab: this is the "don't ask me again" record. */
export const SUPPRESS_KEY = "taify:nl:suppress";

/** sessionStorage. Per-visit state, deliberately gone when the tab closes. */
export const TOOLS_KEY = "taify:nl:tools";
export const DWELL_KEY = "taify:nl:dwell";
export const SHOWN_KEY = "taify:nl:shown";

// ── Thresholds ───────────────────────────────────────────────────────────────

/** Tool pages seen this session before the modal is earned. */
export const TOOL_VIEWS_REQUIRED = 2;

/** Accumulated attention on /browse and /category/* before the modal fires. */
export const DWELL_MS = 30_000;

/**
 * Grace before either automatic trigger is allowed to interrupt.
 *
 * The condition is usually already true at the moment the page paints — the
 * second tool page is the second tool page before anything renders — and a
 * dialog that lands on top of content the visitor has not seen yet reads as a
 * pop-up rather than an offer.
 */
export const FIRE_DELAY_MS = 1_400;

/**
 * How long a blog post is left alone before exit intent is armed.
 *
 * Without it, a cursor travelling to a browser tab in the first second counts
 * as leaving, and the visitor is asked for their email before they have read
 * a paragraph.
 */
export const EXIT_ARM_MS = 5_000;

/** Dismissal is honoured for this long. */
export const DISMISS_DAYS = 30;
export const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;

/** Below this, one field was filled faster than a person reads an offer. */
export const FAST_FILL_MS = 1_200;

// ── Path rules ───────────────────────────────────────────────────────────────

/** Strip the query, the hash and any trailing slash. "/" stays "/". */
export function normalizePath(pathname: string): string {
  const path = (pathname || "/").split("?")[0].split("#")[0];
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The slug of a tool page, or null anywhere else. */
export function toolSlug(pathname: string): string | null {
  const match = /^\/tool\/([^/]+)$/.exec(normalizePath(pathname));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Pages where 30 seconds of attention is the signal.
 *
 * `/categories` is the index of categories and is not one of them — it is a
 * link list people cross in three seconds.
 */
export function isDwellPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    path === "/browse" ||
    path.startsWith("/browse/") ||
    path === "/category" ||
    path.startsWith("/category/")
  );
}

/**
 * Blog posts, where leaving is the signal.
 *
 * The `/blog` index itself is excluded: it is a list of links, so a cursor
 * heading out of it is someone navigating, not someone finishing.
 */
export function isExitIntentPath(pathname: string): boolean {
  return normalizePath(pathname).startsWith("/blog/");
}

/** The one rule that governs this path, or null if none of them do. */
export function triggerForPath(pathname: string): Trigger | null {
  if (toolSlug(pathname)) return "tools";
  if (isDwellPath(pathname)) return "dwell";
  if (isExitIntentPath(pathname)) return "exit";
  return null;
}

// ── Suppression ──────────────────────────────────────────────────────────────

export interface Suppression {
  /** Why we are staying quiet. */
  state: "dismissed" | "subscribed";
  /** Epoch ms at which the record lapses. `null` means never. */
  until: number | null;
  /** When it was written, for debugging a report of "it keeps showing". */
  at: number;
}

export function dismissedRecord(now: number): Suppression {
  return { state: "dismissed", until: now + DISMISS_MS, at: now };
}

export function subscribedRecord(now: number): Suppression {
  return { state: "subscribed", until: null, at: now };
}

/**
 * Read a stored record back.
 *
 * Anything unrecognisable returns null, which means "ask again". The opposite
 * default is tempting — treat junk as suppression, err towards quiet — but it
 * turns one corrupt value into a visitor who can never subscribe, and the
 * record is rewritten on the next dismissal anyway.
 */
export function parseSuppression(raw: string | null): Suppression | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Suppression>;
    if (value?.state !== "dismissed" && value?.state !== "subscribed") return null;
    const until =
      value.until === null || value.until === undefined
        ? null
        : Number(value.until);
    if (until !== null && !Number.isFinite(until)) return null;
    return {
      state: value.state,
      until,
      at: Number.isFinite(Number(value.at)) ? Number(value.at) : 0,
    };
  } catch {
    return null;
  }
}

/** True while the record still holds. A lapsed dismissal is not suppression. */
export function isSuppressed(record: Suppression | null, now: number): boolean {
  if (!record) return false;
  if (record.until === null) return true;
  return now < record.until;
}
