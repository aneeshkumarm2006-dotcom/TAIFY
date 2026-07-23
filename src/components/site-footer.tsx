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
          <div className="flex gap-12">
            <FooterCol
              title="Discover"
              links={[
                ["Browse all", "/browse"],
                ["AI Match", "/match"],
                ["Compare", "/compare"],
              ]}
            />
            <FooterCol
              title="For makers"
              links={[
                ["Submit a tool", "/submit"],
                ["Pricing", "/submit"],
              ]}
            />
          </div>
        </div>
        <div className="mono mt-10 flex flex-col gap-2 border-t border-line pt-6 text-[11px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} TAIFY · a field guide to AI</span>
          <span className="flex items-center gap-3">
            <Link href="/login" className="transition-colors hover:text-accent">
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
