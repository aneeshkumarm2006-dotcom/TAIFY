export type Pricing = "free" | "freemium" | "trial" | "paid";

/**
 * How much of the product is actually AI.
 *
 * `native`  - the tool doesn't exist without AI (Midjourney, ElevenLabs, Granola).
 * `feature` - established software that added AI later and is fully usable
 *             without it (Figma, Zapier, Power BI, Yardi).
 *
 * Listing both is deliberate: people search for "Figma AI". Labelling which is
 * which is the honest way to do it, and lets /browse filter to AI-native only.
 */
export type AiDepth = "native" | "feature";

export interface Tool {
  /** slug - URL id, e.g. "rewrite-studio" */
  slug: string;
  /** catalog id shown in mono, e.g. "AI·0417" */
  code: string;
  name: string;
  tagline: string;
  description: string;
  /** short brand mark, 2 letters (fallback tile) */
  mark: string;
  /** brand color for the logo tile */
  color: string;
  /** real brand logo URL (falls back to the letter tile on error) */
  logo?: string;
  /** screenshot / gallery image URLs */
  images?: string[];
  /** demo video - a YouTube/Vimeo URL or an mp4 URL */
  video?: string;
  company: string;
  category: string;
  tags: string[];
  pricing: Pricing;
  /** whether AI is the product or a feature bolted onto it */
  aiDepth: AiDepth;
  /** real "~$/mo to actually use" - 0 means free */
  costPerMonth: number;
  /** owner-facing: what it costs to be listed/promoted here */
  listingCost: string;
  /** ISO date of last automated freshness check */
  verifiedAt: string;
  launched: string; // "2024·03"
  url: string;
  featured?: boolean;
  pros: string[];
  cons: string[];
  /** best-for one-liner used on detail + compare */
  bestFor: string;
}

/**
 * The subset of a Tool that a card actually renders.
 *
 * Grids and logo strips are client components, so whatever they receive is
 * serialised into the RSC payload embedded in the HTML. Passing whole Tool
 * objects shipped description/pros/cons/images for every tool on /browse and
 * was the main driver behind the "low text to HTML ratio" warning across all
 * 95 pages. `Tool` is assignable to these, so `toCardTool` is opt-in per call
 * site.
 */
export type CardTool = Pick<
  Tool,
  | "slug"
  | "name"
  | "mark"
  | "color"
  | "logo"
  | "code"
  | "category"
  | "tagline"
  | "pricing"
  | "aiDepth"
  | "verifiedAt"
  | "costPerMonth"
>;

/** Even smaller: what a bare logo tile needs. */
export type LogoTool = Pick<Tool, "slug" | "name" | "mark" | "color" | "logo">;

export interface Category {
  slug: string;
  name: string;
  emoji?: string;
}

// ---------- Blog / SEO ----------

export type LinkRel = "dofollow" | "nofollow" | "sponsored";
export type PostStatus = "draft" | "published";
export type PostTemplate =
  | "how-to"
  | "listicle"
  | "comparison"
  | "review"
  | "news"
  | "generic";

export interface KeywordLink {
  keyword: string;
  url: string;
  rel: LinkRel;
}

export interface Post {
  slug: string;
  title: string;
  template: PostTemplate;
  body: string; // HTML
  excerpt: string; // also meta description
  metaTitle: string;
  coverImage: string;
  keywords: KeywordLink[];
  linkFirstOnly: boolean;
  status: PostStatus;
  author: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
