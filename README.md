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
| `INDEXNOW_KEY` | optional | Auto-submits changed URLs to Bing & co. — see [IndexNow](#-indexnow-auto-indexing). Needs a matching `public/<key>.txt` committed |

See `.env.example` for the full annotated list (dashboard auth, SMTP, Turnstile,
Vercel Blob).

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm db:seed` | Seed / update the MongoDB catalog (idempotent) |
| `pnpm lint` | Lint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm indexnow:ping <url>…` | Manually submit URLs to IndexNow |
| `pnpm indexnow:ping --all` | Submit every URL in the production sitemap |

---

## ⚡ IndexNow auto-indexing

[IndexNow](https://www.indexnow.org) is a free, open protocol: one POST tells
**Bing, Yandex, Naver, Seznam and Yep** that a URL was published, changed or
removed, instead of waiting for a crawler to rediscover it. Google does not
participate — but Bing is a primary retrieval layer behind **ChatGPT Search** and
Copilot, so this is the fastest route into AI search. New tool pages are the whole
product surface here, which makes the gap between "published" and "findable" the
thing worth closing.

**It ships dark.** With `INDEXNOW_KEY` unset nothing is submitted, no request is
made, and every publish path behaves exactly as before.

### Setup — one manual step

1. **Get a key.** [bing.com/webmasters](https://www.bing.com/webmasters) →
   **IndexNow** → generate a key (any 8–128 character hex string is valid).
2. **Commit the key file.** Create `public/<key>.txt` containing the key and
   nothing else, and commit it:

   ```bash
   echo -n "<key>" > public/<key>.txt
   ```

   This is how the protocol verifies you control the domain: it fetches
   `https://www.thereisanaiforyou.com/<key>.txt` and compares. The file is
   **public by design and belongs in git** — it is not a secret. If it is missing
   or its contents do not match, every submission comes back `403`.
3. **Set the env var in Vercel.** `INDEXNOW_KEY=<key>` on the **Production**
   environment.
4. **Add the GitHub secret.** Repo → Settings → Secrets and variables → Actions →
   `INDEXNOW_KEY=<key>`, for the workflow below.
5. **Backfill once**, so the existing catalog is submitted rather than trickling
   in as pages happen to change:

   ```bash
   pnpm indexnow:ping --all --dry-run   # check the list first
   pnpm indexnow:ping --all
   ```

### How it fires

| Trigger | What happens |
| --- | --- |
| A submission is approved (`/api/admin/submissions/[id]/publish`) | The new `/tool/<slug>`, `/browse` and its category page, within minutes |
| A tool is created, edited or deleted | The listing; plus `/browse` and both category pages when the category changed |
| A page or post is published, edited, unpublished or deleted | The URL, plus its parent index (`/blog`, `/categories`) |
| A page slug changes | Old **and** new URL — the old one so the crawler sees the 308 and moves the ranking across |
| Push to `main` (`.github/workflows/indexnow.yml`) | Waits for the Vercel production deploy to go live, diffs `/sitemap.xml` against the previous run's snapshot (`actions/cache`), submits only what changed |

Unpublished and deleted URLs are submitted **on purpose**: that is what brings the
crawler back to the 404 so it drops the page, instead of serving a listing that no
longer exists for weeks.

### Design notes

- `src/lib/indexnow.ts` is the only place that talks to the endpoint. Native
  `fetch`, no dependencies.
- **Fire-and-forget.** `pingIndexNow()` returns `void`, never throws, and is never
  awaited in a request path — a search engine being slow can never turn a
  successful publish into a 500. Work is scheduled with Next's `after()` so it
  survives the response on serverless.
- **Production only.** Gated on `VERCEL_ENV === "production"`, because preview
  deploys read the same catalog database and would otherwise submit URLs on behalf
  of the real domain.
- URLs are deduped, resolved against `SITE_URL` from `src/lib/site.ts` (the same
  source `src/app/sitemap.ts` uses — the domain is never hardcoded), and filtered
  against the noindex prefixes (`/admin`, `/seoteam`, `/preview`, `/login`,
  `/api/`). One off-host URL makes IndexNow reject the *entire* batch, so nothing
  unrecognised is ever sent.
- `403` and `422` are logged loudly — both mean the key file is wrong, and both
  would otherwise fail silently and permanently.

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
    site.ts       # canonical SITE_URL + title/description helpers
    indexnow.ts   # IndexNow submissions (see below)
    types.ts, utils.ts
scripts/
  seed.ts             # catalog seeder
  indexnow-ping.ts    # manual / backfill IndexNow submission
public/
  <key>.txt       # IndexNow ownership proof — public, committed
```

---

## 🛣 Roadmap

- [ ] Atlas Vector Search embeddings for true semantic search
- [ ] Accounts + saved lists
- [ ] Maker dashboard & submission review
- [ ] Automated freshness/verification crawler

---

Built with care. © TAIFY
