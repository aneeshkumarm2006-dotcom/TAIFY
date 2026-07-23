"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, FileText, LogOut, Settings, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Tools", icon: LayoutGrid },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/seoteam", label: "Blog", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-card">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-6 lg:px-10">
        <Link href="/admin" className="flex items-baseline gap-[2px] text-[17px] font-extrabold tracking-tight">
          TAIFY<span className="text-accent">.</span>
          <span className="mono ml-1.5 text-[10px] font-medium uppercase tracking-widest text-ink-soft">
            team
          </span>
        </Link>
        <nav className="ml-4 flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/admin"
                ? pathname === "/admin"
                : pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-accent-wash text-accent-ink"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mono ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-accent hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </header>
  );
}
