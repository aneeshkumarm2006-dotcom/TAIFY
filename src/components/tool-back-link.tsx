"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Context-aware back link for a tool page.
 * Defaults (server-render) to the tool's own category so "back" always returns
 * somewhere sensible and the link is crawlable. After hydration, if the visitor
 * actually arrived from the full browse list, it switches to "all tools".
 */
export function ToolBackLink({
  categorySlug,
  categoryName,
}: {
  categorySlug: string;
  categoryName: string;
}) {
  const [target, setTarget] = useState({
    href: `/category/${categorySlug}`,
    label: `back to ${categoryName}`,
  });

  useEffect(() => {
    const ref = document.referrer;
    if (!ref) return;
    try {
      const u = new URL(ref);
      if (u.origin !== window.location.origin) return;
      if (u.pathname.startsWith("/browse")) {
        setTarget({ href: "/browse", label: "all tools" });
      } else if (
        u.pathname.startsWith("/category/") &&
        u.pathname !== `/category/${categorySlug}`
      ) {
        // Arrived from a different category surface (e.g. via search) - honour it.
        setTarget({ href: u.pathname, label: "back" });
      }
    } catch {
      /* malformed referrer - keep the category default */
    }
  }, [categorySlug]);

  return (
    <Link
      href={target.href}
      className="mono text-[12px] text-ink-soft transition-colors hover:text-accent"
    >
      ← {target.label}
    </Link>
  );
}
