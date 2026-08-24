"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DWELL_KEY,
  DWELL_MS,
  EXIT_ARM_MS,
  FIRE_DELAY_MS,
  SHOWN_KEY,
  SUPPRESS_KEY,
  TOOLS_KEY,
  TOOL_VIEWS_REQUIRED,
  type Trigger,
  dismissedRecord,
  isDwellPath,
  isExitIntentPath,
  isSuppressed,
  parseSuppression,
  subscribedRecord,
  toolSlug,
} from "@/lib/newsletter/triggers";

/**
 * The side-effect half of the newsletter modal: counters, timers and the
 * mouse listener that decide when it opens. The rules themselves are in
 * lib/newsletter/triggers.ts, which is pure and tested.
 *
 * Everything that touches Storage goes through the helpers at the bottom.
 * Safari in private mode throws on `localStorage.setItem`, and an exception
 * thrown out of an effect on a tool page would take the page down with it —
 * so a storage failure degrades to "no record", and `firedThisMount` keeps
 * the modal to once per visit even when nothing can be persisted.
 */
export interface NewsletterTrigger {
  open: boolean;
  /** Which rule opened it. Sent to the API so we can see what converts. */
  trigger: Trigger | null;
  /** Closed without subscribing: quiet for 30 days. */
  dismiss: () => void;
  /** Subscribed: quiet forever. */
  markSubscribed: () => void;
}

export function useNewsletterTrigger(): NewsletterTrigger {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<Trigger | null>(null);

  /**
   * Once per mount, regardless of what storage did. Also the guard that makes
   * React's development double-effect harmless.
   */
  const fired = useRef(false);

  const fire = useCallback((reason: Trigger) => {
    if (fired.current) return;
    fired.current = true;
    session.set(SHOWN_KEY, "1");
    setTrigger(reason);
    setOpen(true);
  }, []);

  useEffect(() => {
    // Already told us no, or already on the list.
    if (isSuppressed(parseSuppression(local.get(SUPPRESS_KEY)), Date.now())) return;
    // Shown earlier in this visit. A second ask in one session is nagging even
    // when the first one was neither dismissed nor accepted.
    if (session.get(SHOWN_KEY)) return;
    if (fired.current) return;

    // ── Rule 1: the second tool page of the session ──────────────────────────
    const slug = toolSlug(pathname);
    if (slug) {
      // Distinct slugs, not raw view counts. A refresh, a back-navigation and
      // React's development double-mount all re-run this effect on the same
      // page, and every one of them would inflate a plain counter. Two
      // different tools is also the signal we actually mean by "engaged".
      const seen = new Set(session.json<string[]>(TOOLS_KEY) ?? []);
      if (!seen.has(slug)) {
        seen.add(slug);
        session.set(TOOLS_KEY, JSON.stringify([...seen]));
      }
      if (seen.size < TOOL_VIEWS_REQUIRED) return;

      const timer = window.setTimeout(() => fire("tools"), FIRE_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    // ── Rule 2: 30 seconds of attention on /browse or /category/* ────────────
    if (isDwellPath(pathname)) {
      // Accumulated across the session, not per page. Someone who spends
      // twelve seconds on each of three category pages has browsed for
      // thirty-six seconds, and a per-page timer would never notice.
      const tick = window.setInterval(() => {
        // A tab left open in the background is not attention, and a modal
        // waiting on the other side of it is a nasty surprise on return.
        if (document.visibilityState !== "visible") return;
        const total = (session.number(DWELL_KEY) ?? 0) + TICK_MS;
        session.set(DWELL_KEY, String(total));
        if (total >= DWELL_MS) {
          window.clearInterval(tick);
          fire("dwell");
        }
      }, TICK_MS);
      return () => window.clearInterval(tick);
    }

    // ── Rule 3: exit intent on a blog post ───────────────────────────────────
    if (isExitIntentPath(pathname)) {
      // Exit intent is a mouse gesture and has no touch equivalent: a phone
      // never fires `mouseout` towards the chrome. Rather than approximate it
      // with a scroll-depth guess nobody asked for, coarse pointers simply do
      // not see the blog variant.
      if (!window.matchMedia?.("(pointer: fine)").matches) return;

      let armed = false;
      const arm = window.setTimeout(() => {
        armed = true;
      }, EXIT_ARM_MS);

      const onLeave = (event: MouseEvent) => {
        // relatedTarget is null only when the pointer left the document
        // itself; clientY at or above the top edge means it went towards the
        // tabs and the address bar rather than out of a side.
        if (!armed || event.relatedTarget || event.clientY > 0) return;
        fire("exit");
      };

      document.addEventListener("mouseout", onLeave);
      return () => {
        window.clearTimeout(arm);
        document.removeEventListener("mouseout", onLeave);
      };
    }
  }, [pathname, fire]);

  const dismiss = useCallback(() => {
    setOpen(false);
    // Never weaken a record that is already stronger. Every way of closing the
    // panel lands here - the X, Escape, the backdrop, "No thanks", and the
    // timer that closes it after a successful signup - and that last one would
    // otherwise downgrade a subscriber's "forever" to thirty days.
    const existing = parseSuppression(local.get(SUPPRESS_KEY));
    if (existing?.state === "subscribed") return;
    local.set(SUPPRESS_KEY, JSON.stringify(dismissedRecord(Date.now())));
  }, []);

  const markSubscribed = useCallback(() => {
    local.set(SUPPRESS_KEY, JSON.stringify(subscribedRecord(Date.now())));
  }, []);

  return { open, trigger, dismiss, markSubscribed };
}

/** Dwell resolution. One second is fine for a thirty-second threshold. */
const TICK_MS = 1_000;

/**
 * Storage that cannot throw.
 *
 * Private-mode Safari, a blocked third-party context and a full quota all
 * raise on write, and none of them is a reason to break the page the modal
 * happens to be sitting on.
 */
function wrap(pick: () => Storage) {
  const get = (key: string): string | null => {
    try {
      return pick().getItem(key);
    } catch {
      return null;
    }
  };
  return {
    get,
    set(key: string, value: string) {
      try {
        pick().setItem(key, value);
      } catch {
        /* Nothing to do: the in-memory guard still holds for this visit. */
      }
    },
    json<T>(key: string): T | null {
      const raw = get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    number(key: string): number | null {
      const value = Number(get(key));
      return Number.isFinite(value) ? value : null;
    },
  };
}

const local = wrap(() => window.localStorage);
const session = wrap(() => window.sessionStorage);
