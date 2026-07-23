import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { ButtonLink } from "./ui/button";

const LINKS = [
  { href: "/", label: "Discover" },
  { href: "/browse", label: "Browse" },
  { href: "/match", label: "AI Match" },
  { href: "/compare", label: "Compare" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--ground)_86%,transparent)] backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-15 max-w-[1440px] items-center gap-5 px-6 py-3 lg:px-10">
        <Link
          href="/"
          className="flex items-baseline gap-[2px] text-[20px] font-extrabold tracking-tight"
        >
          TAIFY<span className="text-accent">.</span>
          <span className="mono ml-2 hidden text-[11px] font-medium text-ink-soft sm:inline">
            There&apos;s An AI For You
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-accent-wash/50 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ButtonLink
            href="/match"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            Find my AI
          </ButtonLink>
          <ButtonLink href="/submit" variant="primary" size="sm">
            Submit a tool
          </ButtonLink>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
