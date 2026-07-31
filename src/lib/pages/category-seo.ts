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
      "Knowledge Assistant | Scientific Assistant | Academic Assistant | TAIFY",
    excerpt:
      "Compare the best knowledge assistant, scientific assistant, and academic assistant AI tools for research, literature reviews, citations, papers, and fact-based answers.",
  },
  design: {
    metaTitle: "Design Assistant | Creative Assistant | TAIFY",
    excerpt:
      "Discover the best design assistant and creative assistant AI tools for presentations, graphics, UI design, websites, branding, and visual content creation.",
  },
  education: {
    metaTitle: "Learning Assistant | Academic Helper | Learning Helper | TAIFY",
    excerpt:
      "Explore AI learning assistant, academic helper, and learning helper tools for studying, homework, tutoring, flashcards, math, and exam preparation.",
  },
  productivity: {
    metaTitle:
      "Workplace Assistant | Office Assistant | Business Assistant | TAIFY",
    excerpt:
      "Compare AI workplace assistant, office assistant, and business assistant tools to automate meetings, notes, scheduling, workflows, and everyday productivity.",
  },
  data: {
    metaTitle: "Data Analyst Assistant | Data Assistant | TAIFY",
    excerpt:
      "Find the best data analyst assistant and data assistant AI tools for data analysis, spreadsheets, dashboards, reporting, charts, and business insights.",
  },
  marketing: {
    metaTitle: "Marketing Assistant | SEO Assistant | Campaign Assistant | TAIFY",
    excerpt:
      "Compare AI marketing assistant, SEO assistant, and campaign assistant tools for content marketing, SEO, ads, social media, analytics, and business growth.",
  },
};
