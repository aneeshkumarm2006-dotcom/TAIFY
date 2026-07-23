# TAIFY — There's An AI For You

**The field guide to AI.** Describe what you're trying to do and TAIFY recommends
the *right* few tools — not a wall of ten thousand. Every listing is verified
daily and shows honest, real-world pricing.

> Most AI directories are dead lists you scroll forever. TAIFY is a
> recommendation engine: tell it the job, get the three tools worth your time —
> with reasons.

---

## ✨ What makes TAIFY different

- **🎯 AI task-matching** — describe your task in plain English and get the top 3
  tools, each with a one-line *"why this fits you"* rationale.
- **🔍 Intent search** — find tools by what you want to do, not just exact keywords.
- **✅ Freshness & trust** — every tool is auto-checked and stamped
  *"verified Nd ago"*, so you never land on a dead product.
- **💸 Cost transparency** — the real *"~$/mo to actually use"* is shown up front,
  alongside honest pricing tiers.
- **⚖️ Head-to-head compare** — auto-generated *A vs B* comparisons with a clear
  verdict.

---

## 🖥 Pages

| Route | What it does |
| --- | --- |
| `/` | Discovery home — natural-language search + trending / just-launched / most-saved rails |
| `/browse` | Full catalog with filters (pricing, verified-only, free-tier, category) and sort |
| `/tool/[slug]` | Tool detail — overview, strengths/watch-outs, honest pricing, related tools |
| `/match` | AI Match — describe a task, get the best 3 tools with reasoning |
| `/compare` | Side-by-side comparison with a verdict |
| `/submit` | List your AI tool |

---

## 🧱 Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19** + **TypeScript**
- **[Tailwind CSS v4](https://tailwindcss.com)** — custom "field guide" design system
  (warm paper + ink, persimmon accent, full light/dark)
- **[MongoDB Atlas](https://www.mongodb.com/atlas)** — tool catalog (+ Atlas Vector
  Search for semantic matching)
- **[Anthropic Claude](https://www.anthropic.com)** — the AI task-matching engine
- **[Lucide](https://lucide.dev)** icons · **[Motion](https://motion.dev)** animations

---

## 🚀 Getting started

```bash
# 1. Install
pnpm install

# 2. Configure environment
cp .env.example .env.local
#    then fill in MONGODB_URI (and optionally ANTHROPIC_API_KEY)

# 3. Seed the catalog into MongoDB
pnpm db:seed

# 4. Run
pnpm dev            # → http://localhost:3000
```

> **Runs with zero config too:** without `MONGODB_URI`, the app serves a built-in
> sample catalog. Without `ANTHROPIC_API_KEY`, AI Match falls back to keyword
> ranking. Add each when you're ready and the app upgrades automatically.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | for live data | Atlas connection string (append `/taify` to name the DB) |
| `ANTHROPIC_API_KEY` | optional | Enables real AI reasoning in AI Match |
| `ANTHROPIC_MODEL` | optional | Matching model (default `claude-haiku-4-5`) |

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm db:seed` | Seed / update the MongoDB catalog (idempotent) |
| `pnpm lint` | Lint |

---

## 🗂 Project structure

```
src/
  app/            # routes (home, browse, tool, match, compare, submit) + /api/match
  components/     # UI — cards, search, filters, nav, theme
  data/           # sample tool catalog
  lib/
    data.ts       # data-access layer (MongoDB, with sample fallback)
    db/mongo.ts   # MongoDB client
    types.ts, utils.ts
scripts/
  seed.ts         # catalog seeder
```

---

## 🛣 Roadmap

- [ ] Atlas Vector Search embeddings for true semantic search
- [ ] Accounts + saved lists
- [ ] Maker dashboard & submission review
- [ ] Automated freshness/verification crawler

---

Built with care. © TAIFY
