"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { useNewsletterTrigger } from "./use-newsletter-trigger";

/** Focusable descendants of the panel, for the Tab trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The newsletter offer, as a console panel.
 *
 * Mounted once in the root layout. It renders nothing at all until a rule in
 * use-newsletter-trigger fires, so the cost on every other page is one
 * `usePathname` subscription and a counter.
 */
export function NewsletterModal() {
  const { open, trigger, dismiss, markSubscribed } = useNewsletterTrigger();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Honeypot. Never shown to a person, so anything in it came from a bot.
  const [website, setWebsite] = useState("");

  const panel = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  const restoreFocusTo = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();

  // ── Focus, scroll lock and Escape ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    openedAt.current = Date.now();
    restoreFocusTo.current = document.activeElement;

    // The panel takes focus, not the input. Focusing the field would throw up
    // the software keyboard the instant the modal appears on a phone, which
    // reads as an ambush; the field is one tap or one Tab away.
    panel.current?.focus({ preventScroll: true });

    // Lock the page behind the dialog, compensating for the scrollbar so the
    // layout does not jump sideways as it disappears.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;

      // Focus trap. `aria-modal` tells a screen reader the rest of the page is
      // gone; it does not stop Tab from walking into it.
      const focusable = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      (restoreFocusTo.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [open, dismiss]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) {
      setError("Enter an email address first.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: address,
          website,
          // Absent means a client that never stamped, which the server treats
          // differently from a suspiciously fast one.
          elapsedMs: openedAt.current ? Date.now() - openedAt.current : undefined,
          trigger,
          path: window.location.pathname,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That did not go through. Try again in a moment.");
        setStatus("error");
        return;
      }
    } catch {
      setError("Network error. Try again in a moment.");
      setStatus("error");
      return;
    }

    // Suppress forever the moment the server says yes, and before the closing
    // animation: a reload during those two seconds must not re-offer.
    markSubscribed();
    setStatus("done");
    window.setTimeout(dismiss, 2_600);
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center p-3 sm:items-center sm:p-6"
          // The backdrop is the click target; the panel sits above it.
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismiss();
          }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="relative w-full max-w-[452px] overflow-hidden rounded-card border border-term-line bg-term-bg text-term-ink shadow-card-lg outline-none"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2.5 border-b border-term-line bg-term-panel px-3.5 py-2.5">
              <span aria-hidden="true" className="flex gap-1.5">
                <Dot className="bg-term-accent" />
                <Dot className="bg-term-ink-soft/50" />
                <Dot className="bg-term-ink-soft/25" />
              </span>
              <span className="mono truncate text-[11px] tracking-[0.06em] text-term-ink-soft">
                taify@friday: ~/subscribe
              </span>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                className="-mr-1 ml-auto cursor-pointer rounded-md p-1 text-term-ink-soft transition-colors hover:bg-white/10 hover:text-term-ink focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <p className="mono text-[11.5px] tracking-[0.14em] text-term-accent uppercase">
                <span aria-hidden="true">$ </span>taify --weekly
                <span aria-hidden="true" className="term-caret ml-1 inline-block">
                  &#9612;
                </span>
              </p>

              <h2
                id={titleId}
                className="mt-3 text-[21px] leading-[1.22] font-extrabold tracking-tight sm:text-[23px]"
              >
                3 new verified AI tools every Friday
              </h2>
              <p id={descId} className="mt-2 text-[14px] leading-relaxed text-term-ink-soft">
                &mdash; with what they actually cost. Real monthly prices, not the
                headline tier.
              </p>

              {status === "done" ? (
                <div
                  role="status"
                  className="mono mt-5 rounded-[10px] border border-verified/35 bg-verified/10 px-4 py-3.5 text-[12.5px] leading-relaxed"
                >
                  <span className="text-verified">&#10003; 200 OK</span> &mdash;
                  you&apos;re on the list.
                  <br />
                  <span className="text-term-ink-soft">
                    First issue lands this Friday.
                  </span>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="mt-5">
                  <label htmlFor="taify-newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-term-line bg-term-panel px-3 focus-within:border-term-accent">
                      <span
                        aria-hidden="true"
                        className="mono text-[13px] text-term-accent"
                      >
                        &gt;
                      </span>
                      <input
                        id="taify-newsletter-email"
                        type="email"
                        name="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-invalid={status === "error" || undefined}
                        className="mono h-11 w-full bg-transparent text-[13.5px] outline-none placeholder:text-term-ink-soft/60"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={status === "saving"}
                      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-term-accent px-4 text-[13.5px] font-bold whitespace-nowrap text-[#1a1006] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:ring-offset-2 focus-visible:ring-offset-term-bg focus-visible:outline-none disabled:opacity-60"
                    >
                      {status === "saving" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Subscribe
                    </button>
                  </div>

                  {/* Honeypot: hidden from people and from screen readers. */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="taify-newsletter-website">Leave this empty</label>
                    <input
                      id="taify-newsletter-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>

                  <div role="alert" aria-live="polite">
                    {error && (
                      <p className="mono mt-2.5 text-[12px] text-term-accent">
                        ! {error}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-term-line pt-3.5">
                    <p className="mono text-[11px] text-term-ink-soft">
                      One email a week. Unsubscribe anytime.
                    </p>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="mono cursor-pointer text-[11px] text-term-ink-soft underline underline-offset-2 transition-colors hover:text-term-ink focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
                    >
                      No thanks
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}
