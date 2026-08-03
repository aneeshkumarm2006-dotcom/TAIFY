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
    metaTitle: "AI Introduction Generator | AI Dialogue Generator | TAIFY",
    excerpt:
      "Explore the best AI introduction generator and AI dialogue generator tools for writing essays, blogs, stories, scripts, emails, and more. Compare features, pricing, and reviews.",
  },
  chatbot: {
    metaTitle: "Best Personal AI Assistant | TAIFY",
    excerpt:
      "Discover the best personal AI assistant tools for writing, coding, research, productivity, and everyday conversations. Compare features, pricing, and reviews.",
  },
  coding: {
    metaTitle: "Best AI Code Editor | TAIFY",
    excerpt:
      "Compare the best AI code editor tools for developers. Discover coding assistants that help you write, debug, refactor, and generate code faster with AI.",
  },
  video: {
    metaTitle: "AI Video Workflow | TAIFY",
    excerpt:
      "Explore AI video workflow tools to create, edit, subtitle, repurpose, and automate video production. Compare the best AI video tools in one place.",
  },
  research: {
    metaTitle:
      "Knowledge, Scientific & Academic Assistant | TAIFY",
    excerpt:
      "Compare the best knowledge assistant, scientific assistant, and academic assistant AI tools for research, literature reviews, citations, papers, and fact-based answers.",
  },
  design: {
    metaTitle: "Design Assistant | Creative Assistant | TAIFY",
    excerpt:
      "Discover the best design assistant and creative assistant AI tools for presentations, graphics, UI design, websites, branding, and visual content creation.",
  },
  education: {
    metaTitle: "Learning Assistant & Academic Helper AI | TAIFY",
    excerpt:
      "Explore AI learning assistant, academic helper, and learning helper tools for studying, homework, tutoring, flashcards, math, and exam preparation.",
  },
  productivity: {
    metaTitle:
      "Workplace, Office & Business Assistant AI | TAIFY",
    excerpt:
      "Compare AI workplace assistant, office assistant, and business assistant tools to automate meetings, notes, scheduling, workflows, and everyday productivity.",
  },
  data: {
    metaTitle: "Data Analyst Assistant | Data Assistant | TAIFY",
    excerpt:
      "Find the best data analyst assistant and data assistant AI tools for data analysis, spreadsheets, dashboards, reporting, charts, and business insights.",
  },
  marketing: {
    metaTitle: "Marketing, SEO & Campaign Assistant AI | TAIFY",
    excerpt:
      "Compare AI marketing assistant, SEO assistant, and campaign assistant tools for content marketing, SEO, ads, social media, analytics, and business growth.",
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
