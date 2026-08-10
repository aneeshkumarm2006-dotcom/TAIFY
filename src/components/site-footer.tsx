import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto max-w-[1440px] px-6 py-12 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-baseline gap-[2px] text-[18px] font-extrabold tracking-tight">
              TAIFY<span className="text-accent">.</span>
            </div>
            <p className="mt-2 text-[13px] text-ink-soft">
              The field guide to AI. Describe your task - we find the right tool.
              Verified daily, honest pricing.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <FooterCol
              title="Discover"
              links={[
                ["Browse all tools", "/browse"],
                ["Categories", "/categories"],
                ["AI Match", "/match"],
                ["Compare tools", "/compare"],
              ]}
            />
            <FooterCol
              title="Read"
              links={[
                ["Guides & comparisons", "/blog"],
                ["Best AI tools for students", "/category/education"],
                ["Best AI coding tools", "/category/coding"],
                ["Best AI writing tools", "/category/writing"],
              ]}
            />
            <FooterCol
              title="By profession"
              links={[
                ["AI for doctors", "/ai-for-doctors"],
                ["AI for lawyers", "/ai-for-lawyers"],
                ["AI for teachers", "/ai-for-teachers"],
                ["AI for accountants", "/ai-for-accountants"],
                ["All professions", "/categories#professions"],
              ]}
            />
            <FooterCol
              title="For makers"
              links={[
                ["Submit a tool", "/submit"],
                ["Listing & pricing", "/submit"],
              ]}
            />
          </div>
        </div>
        <div className="mono mt-10 flex flex-col gap-2 border-t border-line pt-6 text-[11px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} TAIFY · a field guide to AI</span>
          <span className="flex items-center gap-3">
            {/* nofollow: /login is Disallowed in robots.txt, so a followed
                site-wide link just burns crawl budget on a page crawlers are
                told not to fetch (Semrush: "blocked from crawling"). */}
            <Link
              href="/login"
              rel="nofollow"
              className="transition-colors hover:text-accent"
            >
              Team login
            </Link>
            <span>·</span>
            <span>Built with Next.js · MongoDB · Claude</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="eyebrow mb-3">{title}</div>
      <ul className="flex flex-col gap-2">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link
              href={href}
              className="text-[13px] text-ink-soft transition-colors hover:text-accent"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
