"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, injected only when the server hands back a site key.
 *
 * The whole widget is opt-in at runtime: /api/form-config returns null until
 * TURNSTILE_SITE_KEY exists in the environment, and with null this component
 * renders nothing, loads no script, and reports a null token. So the forms
 * behave exactly as they do today until the keys are added, with no code change
 * needed on the day they are.
 *
 * `appearance: "interaction-only"` means a real visitor sees nothing at all -
 * the widget only becomes visible if Cloudflare decides it needs a challenge.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          appearance?: "always" | "execute" | "interaction-only";
          theme?: "auto" | "light" | "dark";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Load the Cloudflare script once per page, however many forms ask for it.
 * Resolves immediately if it is already there.
 */
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Current token, or null when there is nothing to send. */
  token: string | null;
  /** Call after a failed submit. Tokens are single-use. */
  reset: () => void;
  /** True once the site key has been fetched, whatever the answer was. */
  ready: boolean;
}

/**
 * Wires up Turnstile for one form.
 *
 * Returns the token to send with the payload, a reset for after a failed
 * submit, and the element to render. When no key is configured the element is
 * null and the token stays null, and the server does not ask for one either.
 */
export function useTurnstile(): TurnstileHandle & {
  element: React.ReactNode;
} {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Ask the server whether the widget is switched on at all.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/form-config");
        const data = (await res.json()) as { turnstileSiteKey?: string | null };
        if (cancelled) return;
        setSiteKey(data.turnstileSiteKey ?? null);
      } catch {
        // No config means no widget. The server is not enforcing it either in
        // that case, so the form still works.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Render the widget once we know the key and the holder is on the page.
  useEffect(() => {
    if (!siteKey || !holder.current) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !holder.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          theme: "auto",
          callback: (t) => setToken(t),
          // A token lives about five minutes. Someone who leaves a contact form
          // open longer than that must not be told their message failed.
          "expired-callback": () => {
            setToken(null);
            if (window.turnstile && widgetId.current)
              window.turnstile.reset(widgetId.current);
          },
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => {
        // Script blocked or offline. Leave the token null: the server decides
        // what that means, and it will say so in a way the visitor can act on.
      });
    return () => {
      cancelled = true;
      if (window.turnstile && widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          // Already gone.
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  // Tokens are single-use, so a failed submit needs a fresh one before retry.
  const reset = useCallback(() => {
    setToken(null);
    if (window.turnstile && widgetId.current)
      window.turnstile.reset(widgetId.current);
  }, []);

  return {
    token,
    reset,
    ready,
    element: siteKey ? <div ref={holder} className="mt-1" /> : null,
  };
}
