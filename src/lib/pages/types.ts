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
  key: string; // "category:<slug>" or "page:<slug>"
  type: PageType;
  slug: string; // category slug or custom-page slug
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
