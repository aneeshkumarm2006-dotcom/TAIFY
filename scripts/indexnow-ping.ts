/**
 * Manual IndexNow submission.
 *
 * The routes in src/app/api ping on every publish, so this is for the cases they
 * cannot cover: the first run after IndexNow is switched on (nothing in the
 * catalog has ever been submitted), a URL fixed by editing data directly in
 * Atlas, or re-submitting after a 403 from a missing key file.
 *
 *   pnpm indexnow:ping /tool/notion-ai /blog/some-post
 *   pnpm indexnow:ping --all            # every URL in the production sitemap
 *   pnpm indexnow:ping --all --dry-run  # print what would be sent
 *
 * --all reads the live /sitemap.xml rather than the database, so it needs no
 * MONGODB_URI and submits exactly the set of URLs search engines are being told
 * about. Unlike the request-path helper this is NOT gated on VERCEL_ENV: it is
 * run deliberately, from a laptop, against production.
 *
 * Reads INDEXNOW_KEY from the environment (.env.local included).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { SITE_URL } from "../src/lib/site";
import { normalizeIndexNowUrls, submitToIndexNow } from "../src/lib/indexnow";

const argv = process.argv.slice(2);
const all = argv.includes("--all");
const dryRun = argv.includes("--dry-run");
const args = argv.filter((a) => !a.startsWith("--"));

/** Pull every <loc> out of the production sitemap (sitemap.xml is flat here). */
async function sitemapUrls(): Promise<string[]> {
  const url = `${SITE_URL}/sitemap.xml`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) throw new Error(`No <loc> entries in ${url}`);
  return locs;
}

async function main() {
  if (!all && args.length === 0) {
    console.error(
      "Usage: pnpm indexnow:ping <url|path>...\n" +
        "       pnpm indexnow:ping --all [--dry-run]",
    );
    process.exit(1);
  }

  const inputs = all ? await sitemapUrls() : args;
  const urls = normalizeIndexNowUrls(inputs);
  const skipped = inputs.length - urls.length;

  console.log(`${SITE_URL} — ${urls.length} URL(s) to submit${skipped ? `, ${skipped} skipped (duplicate, off-host or noindex)` : ""}`);

  if (dryRun) {
    for (const u of urls) console.log(`  ${u}`);
    console.log("--dry-run: nothing submitted.");
    return;
  }

  if (!process.env.INDEXNOW_KEY?.trim()) {
    console.error("✗ No INDEXNOW_KEY set. Add it to site/.env.local (see .env.example).");
    process.exit(1);
  }
  if (urls.length === 0) {
    console.log("Nothing to submit.");
    return;
  }

  const result = await submitToIndexNow(urls, { verbose: true });
  const failed = result.batches.filter((b) => !b.ok);
  for (const b of failed) {
    console.error(`✗ batch of ${b.count} failed: ${b.error ?? `HTTP ${b.status}`}`);
  }
  if (failed.length) process.exit(1);
  console.log(`✓ Submitted ${result.urls.length} URL(s) in ${result.batches.length} request(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
