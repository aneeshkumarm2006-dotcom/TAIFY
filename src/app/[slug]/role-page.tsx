import Link from "next/link";
import type { Metadata } from "next";
import {
  ROLES,
  assertRolePicksExist,
  rolePath,
  rolePickSlugs,
  type Role,
} from "@/data/roles";
import { filterTools, toCardTool } from "@/lib/data";
import { buildRolePage } from "@/lib/roles/page";
import { buildPageSchema } from "@/lib/pages/schema";
import { Blocks } from "@/components/pages/block-render";
import { RoleSections } from "@/components/pages/role-picks";
import { RoleIcon } from "@/lib/role-icons";
import { absoluteUrl, OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, TITLE_MAX, withBrand } from "@/lib/site";
import type { CardTool, Tool } from "@/lib/types";

/**
 * Renderer for the /ai-for-<role> profession pages.
 *
 * Served from the root-level [slug] catch-all rather than twelve directories of
 * near-identical page.tsx files. Two dynamic segments cannot coexist at the same
 * routing level, and /ai-for-doctors beats /for/doctors on the phrase people
 * actually search, so the catch-all — which already exists to serve root-level
 * SEO pages — takes them.
 */

export function roleMetadata(role: Role): Metadata {
  const page = buildRolePage(role);
  const url = absoluteUrl(rolePath(role));
  const title =
    page.metaTitle.length <= TITLE_MAX
      ? page.metaTitle
      : withBrand(page.title, TITLE_MAX);
  return {
    title,
    description: page.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description: page.excerpt,
      url,
      siteName: SITE_NAME,
      images: OG_IMAGE_CARD,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.excerpt,
      images: [OG_IMAGE],
    },
  };
}

export async function RolePageView({ role }: { role: Role }) {
  // Fails loudly on a renamed or mistyped tool slug instead of quietly dropping
  // the pick from the page. No-op once the lists are correct.
  assertRolePicksExist();

  const page = buildRolePage(role);
  const url = absoluteUrl(rolePath(role));

  // One catalog read, then index it — the alternative is a getTool() round trip
  // per pick, and a role page cites fifteen or more tools.
  const all = await filterTools({});
  const bySlug = new Map(all.map((t) => [t.slug, t]));

  const picked = rolePickSlugs(role)
    .map((s) => bySlug.get(s))
    .filter(Boolean) as Tool[];

  const cardMap: Record<string, CardTool> = {};
  for (const t of picked) cardMap[t.slug] = toCardTool(t);

  const schema = buildPageSchema({
    page,
    url,
    tools: picked,
    crumbs: [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Professions", url: absoluteUrl("/categories#professions") },
      { name: role.h1, url },
    ],
  });

  const others = ROLES.filter((r) => r.slug !== role.slug);

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12 lg:px-10">
      {schema.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span>/</span>
        <Link href="/categories#professions" className="hover:text-accent">
          Professions
        </Link>
      </nav>

      <div className="flex items-start gap-4">
        <span className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-[13px] bg-accent-wash text-accent-ink">
          <RoleIcon slug={role.slug} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-balance text-[clamp(30px,5vw,46px)] font-extrabold tracking-[-0.04em]">
            {role.h1}
          </h1>
          <div className="mono mt-2 text-[12px] text-ink-soft">
            {picked.length} tools · verified prices · updated continuously
          </div>
        </div>
      </div>

      <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
        {role.intro}
      </p>

      <RoleSections role={role} toolMap={cardMap} />

      <Blocks blocks={page.blocks} toolMap={{}} />

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          AI for other professions
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map((r) => (
            <Link
              key={r.slug}
              href={rolePath(r)}
              className="rounded-[10px] border border-line bg-card px-3 py-1.5 text-[13.5px] text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              AI for {r.lower}
            </Link>
          ))}
        </div>
        <p className="mt-6 text-[14.5px] leading-relaxed text-ink-soft">
          Looking for tools by what they do rather than who uses them? Start from{" "}
          <Link
            href="/categories"
            className="text-accent underline-offset-2 hover:underline"
          >
            the categories
          </Link>
          , search{" "}
          <Link
            href="/browse"
            className="text-accent underline-offset-2 hover:underline"
          >
            the full catalog
          </Link>{" "}
          with price filters, or describe the job on{" "}
          <Link
            href="/match"
            className="text-accent underline-offset-2 hover:underline"
          >
            AI Match
          </Link>{" "}
          and get three suggestions with reasons.
        </p>
      </section>
    </div>
  );
}
