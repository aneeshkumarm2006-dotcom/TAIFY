export type BlockType =
  | "richtext"
  | "heading"
  | "faq"
  | "guide"
  | "table"
  | "callout"
  | "cta"
  | "image"
  | "toollist";

export interface BaseBlock {
  id: string;
  type: BlockType;
}
export interface RichTextBlock extends BaseBlock {
  type: "richtext";
  html: string;
}
export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 2 | 3;
  text: string;
}
export interface FaqBlock extends BaseBlock {
  type: "faq";
  heading?: string;
  items: { q: string; a: string }[];
}
export interface GuideBlock extends BaseBlock {
  type: "guide";
  heading?: string;
  steps: { title: string; body: string }[];
}
export interface TableBlock extends BaseBlock {
  type: "table";
  heading?: string;
  columns: string[];
  rows: string[][];
}
export interface CalloutBlock extends BaseBlock {
  type: "callout";
  variant: "info" | "tip" | "warn";
  title?: string;
  body: string;
}
export interface CtaBlock extends BaseBlock {
  type: "cta";
  title: string;
  body?: string;
  buttonLabel: string;
  buttonHref: string;
}
export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt?: string;
  caption?: string;
}
export interface ToolListBlock extends BaseBlock {
  type: "toollist";
  heading?: string;
  slugs: string[];
}
export type Block =
  | RichTextBlock
  | HeadingBlock
  | FaqBlock
  | GuideBlock
  | TableBlock
  | CalloutBlock
  | CtaBlock
  | ImageBlock
  | ToolListBlock;

export type PageType = "category" | "custom";
export type PageStatus = "draft" | "published";

export interface Page {
  /** "category:<category id>" or "page:<slug>". Never changes for a category. */
  key: string;
  type: PageType;
  /** The public path segment. Editable, and for a category it is an override
   *  resolved from lib/categories/data.ts rather than read from this document. */
  slug: string;
  /** Every slug this custom page previously answered to. Never contains `slug`.
   *  Categories keep theirs on the category override document instead. */
  formerSlugs?: string[];
  title: string; // the single H1
  metaTitle: string;
  excerpt: string; // meta description
  intro: string; // intro paragraph under the H1
  blocks: Block[];
  customSchema: string; // raw JSON-LD (optional)
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * A category page as the admin sees it: the page plus the taxonomy fields the
 * editor needs to address the category by its permanent id and show its icon.
 * `Page` itself stays free of them - nothing public needs either.
 *
 * Lives here rather than in pages/data.ts so the client-side admin components
 * can import the type without reaching into a "server-only" module.
 */
export type AdminCategoryPage = Page & { categoryId: string; name: string };

export function emptyBlock(type: BlockType, id: string): Block {
  switch (type) {
    case "richtext":
      return { id, type, html: "<p>Write here…</p>" };
    case "heading":
      return { id, type, level: 2, text: "Section heading" };
    case "faq":
      return { id, type, heading: "FAQ", items: [{ q: "Question?", a: "Answer." }] };
    case "guide":
      return { id, type, heading: "How to", steps: [{ title: "Step 1", body: "Do this." }] };
    case "table":
      return { id, type, heading: "", columns: ["Tool", "Price"], rows: [["", ""]] };
    case "callout":
      return { id, type, variant: "tip", title: "Tip", body: "Something useful." };
    case "cta":
      return { id, type, title: "Find your AI", body: "", buttonLabel: "Find my AI", buttonHref: "/match" };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "toollist":
      return { id, type, heading: "Related tools", slugs: [] };
  }
}
