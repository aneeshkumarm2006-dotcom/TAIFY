export type Pricing = "free" | "freemium" | "trial" | "paid";

export interface Tool {
  /** slug — URL id, e.g. "rewrite-studio" */
  slug: string;
  /** catalog id shown in mono, e.g. "AI·0417" */
  code: string;
  name: string;
  tagline: string;
  description: string;
  /** short brand mark, 2 letters */
  mark: string;
  /** brand color for the logo tile */
  color: string;
  company: string;
  category: string;
  tags: string[];
  pricing: Pricing;
  /** real "~$/mo to actually use" — 0 means free */
  costPerMonth: number;
  /** owner-facing: what it costs to be listed/promoted here */
  listingCost: string;
  saves: number;
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

export interface Category {
  slug: string;
  name: string;
  emoji?: string;
}
