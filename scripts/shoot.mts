// Capture a homepage screenshot for every tool and write a SCREENSHOTS map.
// Usage: npx tsx scripts/shoot.mts   (optionally pass slugs to (re)capture a subset)
//
// The shot is not decoration: it is the `image` every Product node carries
// (see lib/schema/nodes.ts), so a frame that captures nothing is worse than no
// frame at all - it ships an empty white rectangle as the product image Google
// indexes. Hence the paint check below, and the rule that nothing is written
// unless the frame passes it.
import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { TOOLS } from "../src/data/tools";

const OUT_DIR = path.join(process.cwd(), "public", "shots");
const only = new Set(process.argv.slice(2));
const targets = TOOLS.filter((t) => only.size === 0 || only.has(t.slug));

/** How long to let a hero animate in before the first attempt. */
const SETTLE = Number(process.env.SHOT_SETTLE ?? 4000);
/** Visible characters the viewport must contain for the frame to count as painted. */
const MIN_VISIBLE_CHARS = 60;
/** A 1280x800 JPEG of a real page clears this comfortably; a blank one is ~7KB. */
const MIN_BYTES = 12_000;

/**
 * Buttons that stand between the crawler and the page.
 *
 * "Accept and continue" is here because mistral.ai gates its homepage behind a
 * terms modal, which the old five-label list walked straight past and captured
 * as a greyed-out page under a dialog. Order matters: the narrow labels come
 * first so a page offering both "Reject all" and "Accept all" isn't matched on
 * the substring of a longer button.
 */
const DISMISS = [
  "Accept and continue",
  "Accept all",
  "Allow all",
  "Reject all",
  "Only necessary",
  "I agree",
  "Got it",
  "Continue",
  "Accept",
  "Close",
  "Dismiss",
];

/**
 * Where to point the camera when a tool's own link is not a page you can shoot.
 *
 * `url` on a tool is the visit link, and for these two it opens the product
 * rather than a page about it: chat.mistral.ai is a terms dialog over an empty
 * chat window, and podcast.adobe.com boots into an editor that renders nothing
 * without a session. Both have a marketing page one hop away that shows the
 * actual product, which is what belongs in `image` on the Product node.
 *
 * Add an entry only when a capture has demonstrably failed - the default of
 * shooting the tool's own URL is right for the other 216.
 */
const CAPTURE_URL: Record<string, string> = {
  mistral: "https://mistral.ai/products/vibe/",
  "adobe-podcast": "https://podcast.adobe.com/en/enhance",
};

/** One user agent for both the browser and the og:image download. */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: UA,
  deviceScaleFactor: 1,
});

/**
 * Characters of text actually visible in the viewport right now.
 *
 * Not `body.innerText`: a page whose hero fades in from `opacity: 0` returns
 * its full copy from the DOM while rendering nothing, which is how three of
 * these came back as blank rectangles that every other check called a success.
 * Only leaf elements count, so nested markup isn't tallied twice, and opacity
 * is followed up the tree because it is almost always set on a wrapper.
 */
async function visibleChars(page: Page): Promise<number> {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    let total = 0;
    for (const el of document.body.querySelectorAll<HTMLElement>(
      "h1,h2,h3,h4,p,span,a,button,li,strong,em,label",
    )) {
      if (el.children.length) continue;
      const text = el.textContent?.trim() ?? "";
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
      if (r.width < 2 || r.height < 2) continue;
      let opacity = 1;
      let hidden = false;
      let node: HTMLElement | null = el;
      for (let i = 0; node && i < 8; i += 1, node = node.parentElement) {
        const s = getComputedStyle(node);
        if (s.visibility === "hidden" || s.display === "none") {
          hidden = true;
          break;
        }
        opacity *= Number(s.opacity || 1);
      }
      if (hidden || opacity < 0.15) continue;
      total += text.length;
    }
    return total;
  });
}

/**
 * The brand's own social card, downloaded, for a page that will not paint.
 *
 * mistral.ai renders its homepage behind a terms dialog and adobe.com/podcast
 * paints nothing at all under headless Chrome, so no amount of waiting produces
 * a frame worth indexing. Both publish an `og:image` - the picture they hand
 * every other site that links to them - and that is a truer product image than
 * an empty rectangle.
 *
 * It is downloaded rather than linked: the URL goes into `image` on the Product
 * node and into the gallery, and a host that blocks hotlinking or moves the
 * file would break both. Everything under /shots is served from our own domain,
 * which is also the only way Googlebot is guaranteed to be allowed to fetch it.
 */
async function ogImageFor(page: Page, slug: string): Promise<string | null> {
  const src = await page
    .evaluate(() => {
      const pick = (sel: string) =>
        document.querySelector<HTMLMetaElement>(sel)?.content?.trim() || "";
      return (
        pick('meta[property="og:image"]') ||
        pick('meta[name="og:image"]') ||
        pick('meta[name="twitter:image"]') ||
        pick('meta[property="twitter:image"]')
      );
    })
    .catch(() => "");
  if (!src) return null;

  const abs = new URL(src, page.url()).toString();
  const res = await fetch(abs, {
    headers: { "user-agent": UA, accept: "image/*" },
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  if (!res?.ok) return null;

  const type = res.headers.get("content-type") ?? "";
  const ext = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" }[
    type.split(";")[0].trim()
  ];
  if (!ext) return null;

  const buf = Buffer.from(await res.arrayBuffer());
  // Small enough to be a tracking pixel or an error placeholder, not a card.
  if (buf.length < MIN_BYTES) return null;

  await writeFile(path.join(OUT_DIR, `${slug}.${ext}`), buf);
  return `/shots/${slug}.${ext}`;
}

const ok: Record<string, string> = {};
const failed: string[] = [];

for (const t of targets) {
  const page = await ctx.newPage();
  try {
    await page.goto(CAPTURE_URL[t.slug] ?? t.url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(SETTLE);

    // Several passes: dismissing one banner routinely reveals the next. Mistral
    // stacks three - a cookie bar, an Axeptio consent panel, then a terms
    // dialog - and stopping at two left the consent panel across the hero.
    for (let pass = 0; pass < 4; pass += 1) {
      let clicked = false;
      for (const label of DISMISS) {
        const btn = page.getByRole("button", { name: label, exact: false }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(1200);
          clicked = true;
          break;
        }
      }
      if (!clicked) break;
    }

    let buf = await page.screenshot({ type: "jpeg", quality: 78 });
    let chars = await visibleChars(page);
    // One more chance for a slow hero, at double the settle time.
    if (chars < MIN_VISIBLE_CHARS || buf.length < MIN_BYTES) {
      await page.waitForTimeout(SETTLE * 2);
      buf = await page.screenshot({ type: "jpeg", quality: 78 });
      chars = await visibleChars(page);
    }
    if (chars < MIN_VISIBLE_CHARS || buf.length < MIN_BYTES) {
      const card = await ogImageFor(page, t.slug);
      if (card) {
        ok[t.slug] = card;
        console.log(`  og   ${t.slug}  (page never painted - saved its og:image)`);
        continue;
      }
      failed.push(t.slug);
      console.log(`  BLANK ${t.slug}  (${chars} visible chars, ${buf.length}B - not written)`);
      continue;
    }

    await writeFile(path.join(OUT_DIR, `${t.slug}.jpg`), buf);
    ok[t.slug] = `/shots/${t.slug}.jpg`;
    console.log(`  ok   ${t.slug}`);
  } catch (e) {
    failed.push(t.slug);
    console.log(`  FAIL ${t.slug}  (${String((e as Error).message).slice(0, 60)})`);
  } finally {
    await page.close();
  }
}

await browser.close();

// Merge with any previously captured shots so a partial re-run never drops entries.
let prev: Record<string, string> = {};
try {
  prev = (await import("../src/data/screenshots")).SCREENSHOTS;
} catch {
  /* first run - no file yet */
}
// A slug only stays in the map while its file is on disk. Without this, a shot
// that was captured once and later rejected as blank (or deleted by hand) would
// live on in the map as a 404 - which lands in `image` on the Product node and
// is exactly the failure the paint check exists to prevent.
const merged: Record<string, string> = {};
for (const [slug, url] of Object.entries({ ...prev, ...ok })) {
  if (url.startsWith("/shots/") && !existsSync(path.join(process.cwd(), "public", url.slice(1)))) {
    console.log(`  drop ${slug}  (no file at ${url})`);
    continue;
  }
  merged[slug] = url;
}
const body =
  "// Auto-generated by scripts/shoot.mts - homepage screenshots per tool slug.\n" +
  "export const SCREENSHOTS: Record<string, string> = " +
  JSON.stringify(merged, null, 2) +
  ";\n";
await writeFile(path.join(process.cwd(), "src", "data", "screenshots.ts"), body);

console.log(`\ncaptured ${Object.keys(ok).length}/${targets.length}, total ${Object.keys(merged).length}`);
if (failed.length) console.log(`failed: ${failed.join(", ")}`);
