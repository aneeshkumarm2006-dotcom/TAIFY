import Link from "next/link";
import { categoryPath } from "@/lib/categories/data";

export async function SiteFooter() {
  // Resolved by id, not hardcoded. The footer renders inside the root layout, so
  // a stale /category/<old> here would be three redirecting internal links on
  // every page of the site - the exact link-equity leak an editable slug exists
  // to avoid.
  const [students, coding, writing] = await Promise.all([
    categoryPath("education"),
    categoryPath("coding"),
    categoryPath("writing"),
  ]);
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
                ["Best AI tools for students", students],
                ["Best AI coding tools", coding],
                ["Best AI writing tools", writing],
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
                ["Contact us", "/contact"],
              ]}
            />
          </div>
        </div>
        <div className="mono mt-10 flex flex-col gap-2 border-t border-line pt-6 text-[11px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} TAIFY · a field guide to AI</span>
          {/* Deliberately no /login link. It is Disallowed in robots.txt, so a
              followed link trips Semrush's "blocked from crawling" while a
              rel="nofollow" one trips "nofollow attributes in internal links" —
              and because this footer renders on every route, that second one
              fired on all 456 crawled pages. There is no safe way to link it.
              The team reaches /login via src/proxy.ts, which redirects any
              unauthenticated /admin or /seoteam request to /login?next=<dest>. */}
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
