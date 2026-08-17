import type { Post, Tool } from "@/lib/types";
import { absoluteUrl, SITE_DESCRIPTION, SITE_FOUNDED, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { readingTime, sameEntity } from "@/lib/utils";
import {
  breadcrumbId,
  faqId,
  listId,
  orgId,
  postId,
  ref,
  toolId,
  webPageId,
  websiteId,
} from "./ids";

/**
 * Every JSON-LD node the site emits, built in one place.
 *
 * Nodes carry an `@id` but no `@context` — `<JsonLd>` wraps the whole set in a
 * single `@graph` and supplies the context once. Before this module the same
 * breadcrumb loop and Organization reference were retyped in ten route files,
 * which is how /compare ended up naming a page that canonicalises elsewhere and
 * the category pages ended up with nodes attached to nothing.
 */

export interface Crumb {
  name: string;
  url: string;
}

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/* ── site-wide ─────────────────────────────────────────────────────────── */

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": orgId(),
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    slogan: SITE_TAGLINE,
    url: SITE_URL,
    // Dimensions are declared because Google requires an Organization logo of at
    // least 112x112 and will not infer the size of an SVG.
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.svg"),
      width: 512,
      height: 512,
    },
    description: SITE_DESCRIPTION,
    // Emitted only once a real date is set, so no placeholder can ship. There is
    // deliberately no `sameAs`: TAIFY has no social profiles to point at, and
    // inventing them is the kind of thing this file exists to prevent.
    ...(SITE_FOUNDED ? { foundingDate: SITE_FOUNDED } : {}),
  };
}

export function webSiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: ref(orgId()),
    inLanguage: "en",
    // This does NOT enable a sitelinks search box — Google removed that feature
    // on 2024-11-29 and deleted its documentation. It is kept because /match?q=
    // is a real endpoint, and an agent reading this graph can use it to query the
    // catalog directly. Do not re-add it to a list of Google wins.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/match?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/* ── page-level ────────────────────────────────────────────────────────── */

export function breadcrumbNode(path: string, crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId(path),
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function webPageNode({
  path,
  name,
  description,
  type = "WebPage",
  hasBreadcrumb = true,
  primaryImage,
  dateModified,
  about,
  mainEntity,
}: {
  path: string;
  name: string;
  description?: string;
  type?: "WebPage" | "CollectionPage" | "ContactPage";
  hasBreadcrumb?: boolean;
  primaryImage?: string;
  dateModified?: string;
  about?: object;
  mainEntity?: object;
}) {
  return {
    "@type": type,
    "@id": webPageId(path),
    url: absoluteUrl(path),
    name,
    ...(description ? { description } : {}),
    isPartOf: ref(websiteId()),
    inLanguage: "en",
    ...(hasBreadcrumb ? { breadcrumb: ref(breadcrumbId(path)) } : {}),
    ...(primaryImage ? { primaryImageOfPage: primaryImage } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(about ? { about } : {}),
    ...(mainEntity ? { mainEntity } : {}),
  };
}

/**
 * FAQ questions as a sibling node, not folded into the page node — a
 * CollectionPage already claims `mainEntity` for its ItemList.
 *
 * Worth being blunt about what this earns: nothing from Google. FAQ rich results
 * stopped appearing on 2026-05-07 and the documentation was deleted on
 * 2026-06-15, for every site including the gov/health ones the 2023 restriction
 * had spared. It stays because the Q&A pairs are genuinely useful to the AI
 * answer engines this site is optimised for, and because it costs one node. If a
 * crawler ever starts flagging FAQPage as deprecated, deleting this function is
 * the whole fix.
 */
export function faqNode(path: string, items: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": faqId(path),
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q.trim(),
      acceptedAnswer: { "@type": "Answer", text: strip(it.a) },
    })),
  };
}

/* ── lists ─────────────────────────────────────────────────────────────── */

export interface ListEntry {
  name: string;
  url: string;
  /** Full detail for the all-in-one list shape; omit for a plain link list. */
  item?: object;
}

export function itemListNode({
  path,
  key,
  name,
  entries,
  numberOfItems,
}: {
  path: string;
  key: string;
  name: string;
  entries: ListEntry[];
  /** Total the page represents, when more than `entries` are marked up. */
  numberOfItems?: number;
}) {
  return {
    "@type": "ItemList",
    "@id": listId(path, key),
    name,
    numberOfItems: numberOfItems ?? entries.length,
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      ...(e.item ? { item: e.item } : { name: e.name, url: e.url }),
    })),
  };
}

/**
 * A tool as it appears in a listing.
 *
 * Only what the card itself renders: name, tagline and the real monthly cost.
 * No screenshot — the card shows the brand mark, not the shot, and marking up
 * content that isn't on the page is the first thing Google's policies rule out.
 * No `review` or rating either: review markup has to describe "a specific item,
 * not about a category or a list of items", so pros and cons belong on
 * /tool/<slug> alone.
 *
 * The `@id` is the same one the detail page mints, so a tool listed on six
 * category pages stays one entity rather than six.
 */
export function toolListEntry(
  tool: Pick<Tool, "slug" | "name" | "tagline" | "costPerMonth">,
): ListEntry {
  const url = absoluteUrl(`/tool/${tool.slug}`);
  return {
    name: tool.name,
    url,
    item: {
      "@type": "Product",
      "@id": toolId(tool.slug),
      name: tool.name,
      url,
      description: tool.tagline,
      offers: {
        "@type": "Offer",
        price: tool.costPerMonth,
        priceCurrency: "USD",
        url,
      },
    },
  };
}

/* ── tool detail ───────────────────────────────────────────────────────── */

/**
 * Pros and cons, the one rich result a directory with no ratings can honestly
 * earn. Google restricts it to "editorial product review pages, not merchant
 * product pages or customer product reviews" — a third party writing up someone
 * else's software is the definitional case.
 *
 * Two things here are load-bearing:
 *
 * - The notes hang off a nested `Review`, not off `Product`. Google's wording is
 *   "add the positiveNotes and/or negativeNotes properties to your nested product
 *   review", and both of its canonical examples do exactly that.
 * - The strings are `tool.pros` / `tool.cons` untouched, because "the text in the
 *   structured data must match the text on your page" and <ProsCons> renders
 *   those arrays verbatim. Anything that reformats them here — casing, trailing
 *   full stops, truncation — silently kills the rich result while still
 *   validating. scripts/check-schema.mts diffs them against the DOM for that
 *   reason.
 *
 * No `reviewRating`, matching Google's own published example. Their Review
 * reference lists that field as required, so a validator may well ask for it;
 * supplying one would mean inventing a score for 218 tools, which is the same
 * mistake as the `saves` counts that were deleted in e403c8b. `itemReviewed` is
 * omitted because a nested review inherits the parent item.
 */
function reviewNode(tool: Tool) {
  const statements = (items: string[]) => ({
    "@type": "ItemList",
    itemListElement: items.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
    })),
  });
  return {
    "@type": "Review",
    name: `${tool.name} review`,
    author: ref(orgId()),
    ...(tool.pros.length ? { positiveNotes: statements(tool.pros) } : {}),
    ...(tool.cons.length ? { negativeNotes: statements(tool.cons) } : {}),
  };
}

/**
 * `Product`, not `SoftwareApplication`, and single-typed rather than co-typed.
 *
 * Reconsidered in full in 2026 and rejected again. Google's Software App rich
 * result requires name AND offers.price AND a rating or review — where "review"
 * defers to the Review reference, which requires reviewRating.ratingValue. There
 * are no ratings on this site and no honest way to derive one, so every tool page
 * shipped a required-property error (Semrush flagged 203/203) before 7bac39d
 * moved this to Product. Co-typing ["SoftwareApplication", "Product"] would
 * reimport that error on all 218 pages in exchange for a rich result we still
 * can't qualify for.
 *
 * `additionalType` carries the software meaning instead. Be clear about what that
 * does and doesn't buy: Google reads nothing from it — the only time its docs
 * mention the property is to say it isn't supported — but it is valid schema.org
 * and it tells an AI answer engine this is software rather than a physical good,
 * which is the audience this site is built for.
 *
 * Three absences are deliberate:
 * - `availability`, the strongest merchant-listing signal. A merchant listing
 *   asserts we are the seller, and Google bars the experience outright for
 *   "pages with links to other sites that sell the product".
 * - `priceValidUntil`. A date in the past suppresses the snippet, and nothing
 *   here would keep it rolling forward.
 * - the logo in `image`. Logos are google.com/s2/favicons lookups and Google's own
 *   robots.txt is `Disallow: /s2`, so they are uncrawlable. `image` is not
 *   required for a product snippet, so it is emitted only for real screenshots.
 */
export function toolNode(tool: Tool, categoryName: string) {
  const url = absoluteUrl(`/tool/${tool.slug}`);
  const images = (tool.images ?? []).map((p) =>
    p.startsWith("http") ? p : absoluteUrl(p),
  );
  return {
    "@type": "Product",
    "@id": toolId(tool.slug),
    additionalType: "https://schema.org/SoftwareApplication",
    name: tool.name,
    alternateName: tool.tagline,
    description: tool.description,
    url,
    sameAs: tool.url,
    category: categoryName,
    ...(images.length ? { image: images } : {}),
    brand: {
      "@type": "Organization",
      name: tool.company,
      // Only when the maker and the product are one entity. "ChatGPT" by
      // "OpenAI" would otherwise claim chatgpt.com is OpenAI's own site, and no
      // field on the catalog holds a separate company URL.
      ...(sameEntity(tool.name, tool.company) ? { url: tool.url } : {}),
    },
    offers: {
      "@type": "Offer",
      price: tool.costPerMonth,
      priceCurrency: "USD",
      ...(tool.costPerMonth > 0
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: tool.costPerMonth,
              priceCurrency: "USD",
              unitCode: "MON",
            },
          }
        : {}),
      url: tool.url,
    },
    // The visible "Pricing model" row, machine-readable. Not `offers.category`:
    // Google reads `category` in product markup as retail taxonomy, aligned to
    // the Merchant Center product_type attribute, so a pricing model in that slot
    // says something we don't mean.
    additionalProperty: {
      "@type": "PropertyValue",
      name: "Pricing model",
      value: tool.pricing,
    },
    keywords: tool.tags.join(", "),
    // Two statements minimum, in any mix of positive and negative.
    ...(tool.pros.length + tool.cons.length >= 2 ? { review: reviewNode(tool) } : {}),
    // No `isPartOf`: it is a CreativeWork property that SoftwareApplication
    // inherited and Product does not have, so it validates as UNKNOWN_FIELD. The
    // WebPage node carries the link into the site graph instead.
  };
}

/* ── blog ──────────────────────────────────────────────────────────────── */

/**
 * Bylines that name the house rather than a person.
 *
 * Every seeded post is authored by "TAIFY Team", which the old markup typed as a
 * `Person` — Google's Article guidance is explicit that `Person` is for
 * individuals and `Organization` for entities, and a team is not a person.
 */
const HOUSE_BYLINE = /\b(taify|team|editors?|editorial|staff)\b/i;

function authorNode(byline: string) {
  const name = byline.trim();
  // An empty byline is house content, so say so rather than dropping the author.
  if (!name) return ref(orgId());
  if (HOUSE_BYLINE.test(name)) return { "@type": "Organization", name, url: SITE_URL };
  // No `url` on the Person branch: there are no author pages to point at, and
  // Google wants a real profile there or nothing.
  return { "@type": "Person", name };
}

/**
 * A post as listed on /blog. Carries the same `@id` the post page mints, so the
 * index and the article resolve to one entity.
 */
export function postStub(post: Pick<Post, "slug" | "title" | "excerpt" | "publishedAt" | "updatedAt" | "author">) {
  return {
    "@type": "BlogPosting",
    "@id": postId(post.slug),
    headline: post.title,
    description: post.excerpt,
    url: absoluteUrl(`/blog/${post.slug}`),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: authorNode(post.author),
  };
}

export function postNode(
  post: Post,
  { description, mentions }: { description: string; mentions: string[] },
) {
  const path = `/blog/${post.slug}`;
  return {
    "@type": "BlogPosting",
    "@id": postId(post.slug),
    headline: post.title,
    description,
    // An ImageObject with dimensions rather than a bare URL: Google wants at
    // least 50,000 pixels and prefers 16:9, and 1200x675 is what <Image> renders.
    ...(post.coverImage
      ? {
          image: {
            "@type": "ImageObject",
            url: post.coverImage,
            width: 1200,
            height: 675,
          },
        }
      : {}),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    wordCount: post.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
    // The "N min read" line the page already shows, as an ISO 8601 duration.
    timeRequired: `PT${readingTime(post.body)}M`,
    author: authorNode(post.author),
    publisher: ref(orgId()),
    isPartOf: ref(websiteId()),
    mainEntityOfPage: ref(webPageId(path)),
    inLanguage: "en",
    isAccessibleForFree: true,
    // `genre`, not `articleSection`: the template is a content format, and the
    // blog has no published sections to name.
    genre: post.template,
    ...(post.keywords.length
      ? { keywords: post.keywords.map((k) => k.keyword).join(", ") }
      : {}),
    // The tools this post actually links to, already rendered in the "Tools in
    // this post" rail. This is what lets an answer engine resolve "Grok vs
    // ChatGPT" to two entities it has separate pages for, instead of two strings.
    ...(mentions.length ? { mentions: mentions.map(ref) } : {}),
  };
}
