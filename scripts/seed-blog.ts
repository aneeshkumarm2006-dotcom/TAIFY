/**
 * Seed the MongoDB `posts` collection with SEO-optimized blog posts.
 * Run with:  pnpm blog:seed
 * Idempotent (upserts by slug). Keywords auto-link to internal /tool/ pages.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { MongoClient } from "mongodb";
import type { KeywordLink, Post, PostTemplate } from "../src/lib/types";

const now = new Date().toISOString();
const cover = (seed: string) => `https://picsum.photos/seed/${seed}/1200/675`;
const kw = (keyword: string, slug: string): KeywordLink => ({
  keyword,
  url: `/tool/${slug}`,
  rel: "dofollow",
});

type PostSeed = {
  slug: string;
  title: string;
  metaTitle: string;
  excerpt: string;
  template: PostTemplate;
  cover: string;
  keywords: KeywordLink[];
  body: string;
};

const POSTS: PostSeed[] = [
  {
    slug: "best-ai-tools-for-maths",
    title: "Best AI Tools for Maths in 2026: Solve, Learn & Check Your Work",
    metaTitle: "Best AI Tools for Maths in 2026 (Solve & Learn Steps)",
    excerpt:
      "The best AI tools for maths in 2026 — from step-by-step solvers to data analysis. Compare Wolfram Alpha, Photomath, Julius AI and more, ranked by what they do best.",
    template: "listicle",
    cover: cover("taify-maths"),
    keywords: [
      kw("Wolfram Alpha", "wolfram-alpha"),
      kw("Photomath", "photomath"),
      kw("Julius AI", "julius"),
      kw("ChatGPT", "chatgpt"),
      kw("Claude", "claude"),
    ],
    body: `<p>AI has quietly become one of the best ways to learn and check maths — not by handing you answers, but by showing the working. Below are the best AI tools for maths in 2026, ranked by what they actually do well.</p>
<h2>1. Wolfram Alpha — the computation engine</h2><p>For reliable results, Wolfram Alpha is still unmatched. It handles algebra, calculus, linear algebra and statistics, and its step-by-step mode walks you through the method. If you need a correct answer you can trust, start here.</p>
<h2>2. Photomath — scan and learn</h2><p>Photomath lets you point your camera at a handwritten or printed problem and get worked steps instantly. It's ideal for K-12 and early college students who want to understand the method, not just the answer.</p>
<h2>3. Julius AI — maths on your data</h2><p>When the maths involves real data — statistics, regression, probability — Julius AI runs actual computation and produces charts. It's the best pick for quantitative and data-heavy problems.</p>
<h2>4. ChatGPT — explanations and word problems</h2><p>For conceptual questions and tricky word problems, ChatGPT is excellent at explaining <em>why</em> a method works. Pair it with a solver like Wolfram Alpha to verify the final answer.</p>
<h2>5. Claude — careful, step-by-step reasoning</h2><p>Claude is strong at long, careful derivations and proofs, and its clear writing makes it a great tutor for explaining each step in plain language.</p>
<h2>How to choose</h2><ul><li><strong>Need the answer + steps:</strong> Wolfram Alpha or Photomath.</li><li><strong>Data & statistics:</strong> Julius AI.</li><li><strong>Understand the concept:</strong> ChatGPT or Claude.</li></ul>
<h2>The bottom line</h2><p>Use a solver to check your work and an assistant to understand it. Together they turn maths homework into real learning.</p>`,
  },
  {
    slug: "best-ai-tools-for-science",
    title: "Best AI Tools for Science Students & Researchers in 2026",
    metaTitle: "Best AI Tools for Science in 2026 (Research & Study)",
    excerpt:
      "The best AI tools for science in 2026 — find evidence, decode papers, and run literature reviews faster. Compare Consensus, Elicit, SciSpace, NotebookLM and Perplexity.",
    template: "listicle",
    cover: cover("taify-science"),
    keywords: [
      kw("Consensus", "consensus"),
      kw("Elicit", "elicit"),
      kw("SciSpace", "scispace"),
      kw("NotebookLM", "notebooklm"),
      kw("Perplexity", "perplexity"),
      kw("Wolfram Alpha", "wolfram-alpha"),
    ],
    body: `<p>Science moves fast, and reading everything is impossible. These AI tools help students and researchers find evidence, understand papers, and review the literature without drowning in PDFs.</p>
<h2>1. Consensus — science-backed answers</h2><p>Consensus searches peer-reviewed research and tells you what the studies actually conclude, complete with citations and a "consensus meter." It's the fastest way to get an evidence-based answer to a science question.</p>
<h2>2. Elicit — automate your literature review</h2><p>Elicit finds relevant papers and extracts key data — sample sizes, methods, outcomes — into neat tables. For systematic reviews, it saves days of manual work.</p>
<h2>3. SciSpace — understand any paper</h2><p>SciSpace explains dense papers in plain language, decodes equations and jargon, and answers questions about the text. It's like having a tutor sitting beside you as you read.</p>
<h2>4. NotebookLM — synthesize your own sources</h2><p>Upload your papers and notes, and NotebookLM answers strictly from them — no hallucinated citations. It can even generate an audio overview that sounds like a podcast about your material.</p>
<h2>5. Perplexity — cited, up-to-date search</h2><p>For quick, current answers with real sources, Perplexity is the go-to. Great for background reading before you dive into the primary literature.</p>
<h2>Don't forget computation</h2><p>For the quantitative side of science — physics, chemistry, engineering — Wolfram Alpha remains the reliable computational engine.</p>
<h2>The bottom line</h2><p>Use Consensus and Perplexity to find evidence, Elicit for reviews, and SciSpace or NotebookLM to actually understand and synthesize it.</p>`,
  },
  {
    slug: "best-ai-coding-tools",
    title: "Best AI Coding Tools in 2026, Ranked",
    metaTitle: "Best AI Coding Tools in 2026 (Ranked & Compared)",
    excerpt:
      "The best AI coding tools in 2026 — from AI editors to prompt-to-app builders. Compare Cursor, GitHub Copilot, Claude, Replit, v0 and more to find your fit.",
    template: "listicle",
    cover: cover("taify-coding"),
    keywords: [
      kw("Cursor", "cursor"),
      kw("GitHub Copilot", "github-copilot"),
      kw("Claude", "claude"),
      kw("Replit", "replit"),
      kw("v0", "v0"),
      kw("Bolt.new", "bolt"),
      kw("Lovable", "lovable"),
    ],
    body: `<p>AI coding tools have split into two camps: assistants that make you faster in your editor, and builders that turn a prompt into a working app. Here are the best in each category for 2026.</p>
<h2>Best AI code editor: Cursor</h2><p>Cursor is the AI-native editor most developers reach for. Its autocomplete is uncanny, and its agent mode plans and applies changes across your whole repo, runs commands, and fixes its own errors.</p>
<h2>Best IDE plugin: GitHub Copilot</h2><p>If you'd rather stay in your current editor, GitHub Copilot offers reliable inline suggestions, chat, and model choice across every major IDE — and it's GitHub-native.</p>
<h2>Best for deep reasoning: Claude</h2><p>For architecture, refactors, and gnarly bugs, Claude produces careful multi-file changes and clear explanations. Many developers pair it with Cursor.</p>
<h2>Best prompt-to-app builders</h2><p>For shipping full apps from a prompt, three tools lead: Replit (cloud IDE + hosting), Bolt.new (in-browser web apps), and Lovable (polished full-stack apps with Supabase). For frontend UI specifically, v0 generates production React and Tailwind.</p>
<h2>How to choose</h2><ul><li><strong>You already code:</strong> Cursor or GitHub Copilot.</li><li><strong>You want an app fast:</strong> Replit, Bolt.new or Lovable.</li><li><strong>Just the UI:</strong> v0.</li></ul>
<h2>The bottom line</h2><p>Assistants like Cursor make good developers faster; builders like Lovable let anyone ship. Pick based on whether you're editing code or generating it.</p>`,
  },
  {
    slug: "best-ai-tools-for-students",
    title: "Best AI Tools for Students in 2026: Study Smarter, Not Harder",
    metaTitle: "Best AI Tools for Students in 2026 (Study Smarter)",
    excerpt:
      "The best AI tools for students in 2026 — for research, writing, maths, and revision. Compare ChatGPT, Claude, NotebookLM, Photomath and Perplexity.",
    template: "listicle",
    cover: cover("taify-students"),
    keywords: [
      kw("ChatGPT", "chatgpt"),
      kw("Claude", "claude"),
      kw("NotebookLM", "notebooklm"),
      kw("Photomath", "photomath"),
      kw("Perplexity", "perplexity"),
      kw("Gamma", "gamma"),
    ],
    body: `<p>Used well, AI is the best study partner you've ever had — for understanding hard topics, checking your maths, and turning notes into revision material. Here are the best AI tools for students in 2026.</p>
<h2>1. ChatGPT — your all-purpose tutor</h2><p>ChatGPT explains concepts at any level, quizzes you, and helps plan essays. Ask it to "explain like I'm 15" or to generate practice questions from your notes.</p>
<h2>2. Claude — writing and long documents</h2><p>Claude shines at essay feedback, structuring arguments, and working through long readings thanks to its large context window and careful writing.</p>
<h2>3. NotebookLM — revise from your own notes</h2><p>Upload your lecture slides and NotebookLM answers only from them — then turn the material into an audio overview you can revise with on the go.</p>
<h2>4. Photomath — maths homework</h2><p>Stuck on a maths problem? Scan it with Photomath and study the worked steps until the method clicks.</p>
<h2>5. Perplexity — research with sources</h2><p>For essays and projects, Perplexity gives cited answers you can actually reference, saving hours of searching.</p>
<h2>Bonus: Gamma for presentations</h2><p>Need a class presentation? Gamma turns your notes into a polished slide deck in seconds.</p>
<h2>Study smarter, honestly</h2><p>Use AI to understand and check your work — not to replace it. The students who win with AI are the ones who learn <em>from</em> it.</p>`,
  },
  {
    slug: "chatgpt-vs-claude-vs-gemini",
    title: "ChatGPT vs Claude vs Gemini in 2026: Which AI Assistant Wins?",
    metaTitle: "ChatGPT vs Claude vs Gemini 2026 (Honest Comparison)",
    excerpt:
      "ChatGPT vs Claude vs Gemini in 2026 — an honest comparison of the three top AI assistants on writing, coding, research, and price to help you pick.",
    template: "comparison",
    cover: cover("taify-assistants"),
    keywords: [
      kw("ChatGPT", "chatgpt"),
      kw("Claude", "claude"),
      kw("Gemini", "gemini"),
    ],
    body: `<p>Three assistants dominate in 2026: ChatGPT, Claude, and Gemini. They're all excellent — but they're good at different things. Here's an honest, practical comparison.</p>
<h2>ChatGPT — the versatile all-rounder</h2><p>ChatGPT is the most capable generalist: writing, coding, image generation, voice, and web browsing in one place, with the largest ecosystem and a genuinely useful free tier. If you want one assistant that does everything, it's the safe pick.</p>
<h2>Claude — the best writer and coding partner</h2><p>Claude produces the most natural writing and is a favorite for coding and long documents thanks to its huge context window and careful reasoning. If your work is writing- or code-heavy, Claude often edges ahead on quality.</p>
<h2>Gemini — deepest Google integration</h2><p>Gemini is strongest if you live in Google Workspace — it's built into Gmail, Docs, and Android, with strong multimodal reasoning and generous free access.</p>
<h2>Head-to-head</h2><ul><li><strong>Writing quality:</strong> Claude, then ChatGPT.</li><li><strong>Coding:</strong> Claude and ChatGPT are neck-and-neck.</li><li><strong>Everyday versatility:</strong> ChatGPT.</li><li><strong>Google users:</strong> Gemini.</li><li><strong>Price:</strong> all around $20/mo; all have capable free tiers.</li></ul>
<h2>The verdict</h2><p>Pick ChatGPT if you want one assistant for everything, Claude if writing and coding quality matter most, and Gemini if you're deep in Google's ecosystem. Honestly? Many people keep two open.</p>`,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✗ No MONGODB_URI set. Add it to taify/.env.local.");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection<Post>("posts");

  for (const p of POSTS) {
    const set: Omit<Post, "views" | "createdAt"> = {
      slug: p.slug,
      title: p.title,
      template: p.template,
      body: p.body,
      excerpt: p.excerpt,
      metaTitle: p.metaTitle,
      coverImage: p.cover,
      keywords: p.keywords,
      linkFirstOnly: true,
      status: "published",
      author: "TAIFY Team",
      updatedAt: now,
      publishedAt: now,
    };
    await col.updateOne(
      { slug: p.slug },
      { $set: set, $setOnInsert: { views: 0, createdAt: now } },
      { upsert: true },
    );
  }

  await col.createIndex({ slug: 1 }, { unique: true });
  await col.createIndex({ status: 1, publishedAt: -1 });

  console.log(`✓ Seeded ${POSTS.length} blog posts into "${client.db().databaseName}.posts".`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
