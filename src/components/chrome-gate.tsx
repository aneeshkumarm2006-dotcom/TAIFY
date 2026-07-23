"use client";

import { usePathname } from "next/navigation";

/**
 * Shows the public site chrome (nav/footer) everywhere except the private
 * dashboard areas and the login screen, which supply their own chrome.
 */
export function ChromeGate({
  top,
  footer,
  children,
}: {
  top: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seoteam") ||
    pathname === "/login";

  return (
    <>
      {!bare && top}
      <main className="flex-1">{children}</main>
      {!bare && footer}
    </>
  );
}
