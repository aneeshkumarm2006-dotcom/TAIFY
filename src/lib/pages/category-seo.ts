/**
 * Hand-written meta title / description per category, keyed by category slug.
 *
 * These feed the category page's default `metaTitle` / `excerpt`
 * (see `defaultCategoryPage` in ./data.ts), so they render as the <title> and
 * <meta name="description"> on /category/<slug>. A category edited in the admin
 * still wins — stored fields layer on top of these defaults.
 *
 * Slugs not listed here fall back to the generated "Best <Name> AI Tools" copy.
 */
export interface CategorySeo {
  metaTitle: string;
  excerpt: string;
}

export const CATEGORY_SEO: Record<string, CategorySeo> = {
  writing: {
    metaTitle: "AI Dialogue Generator | TAIFY",
    excerpt:
      "Discover AI dialogue generators, AI introduction generators, AI paragraph expanders, and AI two person conversation generators. Compare verified AI writing tools on TAIFY.",
  },
  chatbot: {
    metaTitle: "Best Personal AI Assistant | TAIFY",
    excerpt:
      "Compare the best personal AI assistant, best AI executive assistant, AI office assistant, and best AI phone assistants 2026 with verified features and pricing.",
  },
  coding: {
    metaTitle: "AI Coding Assistant | TAIFY",
    excerpt:
      "Compare AI Coding Assistant tools and the best AI code editors for developers. Find AI coding tools for faster coding, debugging, and code generation.",
  },
  video: {
    metaTitle: "AI Video Workflow | TAIFY",
    excerpt:
      "Explore AI video workflow tools, AI video production full workflow solutions, and AI script writing to video workflow tools for faster content creation.",
  },
  research: {
    metaTitle: "AI Knowledge Assistant | TAIFY",
    excerpt:
      "Compare AI knowledge assistant tools for research, document search, summarization, note-taking, and knowledge management with verified features.",
  },
  design: {
    metaTitle: "Best AI Interior Design App | TAIFY",
    excerpt:
      "Compare the best AI interior design app, AI room design free without login tools, home visualizer AI, and AI bedroom design tools in one place.",
  },
  education: {
    metaTitle: "Best AI for School | TAIFY",
    excerpt:
      "Discover the best AI for school, best AI for college students, AI study guide maker, and AI learning assistant tools for studying and homework.",
  },
  productivity: {
    metaTitle: "Best AI for Business | TAIFY",
    excerpt:
      "Compare the best AI for business, best AI tools for small business, top AI tools for business, and AI tools for product managers on TAIFY.",
  },
  data: {
    metaTitle: "Best AI for Data Analysis | TAIFY",
    excerpt:
      "Compare the best AI for data analysis, AI analyst tools, AI tools for automating Python data analysis, and AI for analyzing data insights on TAIFY.",
  },
  marketing: {
    metaTitle: "Best AI Marketing Tools | TAIFY",
    excerpt:
      "Discover the best AI marketing tools, free AI tools for marketing, best AI marketing tools 2026, AI marketing assistants, and AI ad optimization software.",
  },
  "real-estate": {
    metaTitle: "Best AI Tools for Real Estate Agents | TAIFY",
    excerpt:
      "Discover the best AI tools for real estate: virtual staging, AI listing descriptions, interior design, floor plans, and agent assistants. Compare features, pricing, and reviews.",
  },
  ecommerce: {
    metaTitle: "Best AI Tools for E-Commerce & Online Stores | TAIFY",
    excerpt:
      "Compare the best AI tools for e-commerce: product photography, store chatbots, upsells, and personalization for Shopify and online stores. Honest pricing and reviews.",
  },
  fashion: {
    metaTitle: "Best AI Tools for Fashion & Apparel Brands | TAIFY",
    excerpt:
      "Compare the best AI tools for fashion: on-model product photography, virtual try-on, 3D garment design, print generation, trend forecasting, and AI stylists. Honest pricing and reviews.",
  },
  health: {
    metaTitle: "Best AI Tools for Doctors & Clinicians | TAIFY",
    excerpt:
      "Compare the best AI tools for doctors: ambient medical scribes, clinical decision support, and FDA-cleared imaging AI. Real pricing, honest watch-outs, and what each tool can't do.",
  },
  sales: {
    metaTitle: "Best AI Sales Tools & AI SDRs | TAIFY",
    excerpt:
      "Find the best AI sales tools: AI SDRs, prospecting, data enrichment, cold email, and revenue intelligence. Compare sales and CRM AI with real pricing.",
  },
  support: {
    metaTitle: "Best AI Customer Support Tools | TAIFY",
    excerpt:
      "Compare the best AI customer support tools: AI support agents, chatbots, and helpdesk automation that resolve tickets. Features, pricing, and reviews.",
  },
  legal: {
    metaTitle: "Best AI Tools for Lawyers & Legal Work | TAIFY",
    excerpt:
      "Discover the best legal AI tools for contract review, drafting, and legal research. Compare AI for lawyers and law firms with honest pricing and reviews.",
  },
  finance: {
    metaTitle: "Best AI Tools for Finance & Accounting | TAIFY",
    excerpt:
      "The best AI finance and accounting tools: bookkeeping, spend management, financial analysis, and accounts payable automation. Compare pricing and reviews.",
  },
  hr: {
    metaTitle: "Best AI Tools for HR & Recruiting | TAIFY",
    excerpt:
      "Compare the best AI recruiting and HR tools: candidate sourcing, screening, interviews, and inclusive job posts. Find the right hiring AI with real pricing.",
  },
  social: {
    metaTitle: "Best AI Social Media Tools | TAIFY",
    excerpt:
      "The best AI social media tools for content creation, captions, scheduling, and analytics. Compare AI social media managers and assistants with honest pricing.",
  },
};
