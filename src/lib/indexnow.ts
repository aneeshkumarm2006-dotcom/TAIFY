/**
 * IndexNow - tell Bing, Yandex, Naver, Seznam and Yep that a URL changed, the
 * moment it changes.
 *
 * Why this exists: Google ignores IndexNow, but Bing is the retrieval layer
 * behind ChatGPT Search and Copilot, and its crawler otherwise reaches a new
 * tool page on its own schedule - days, sometimes weeks. New tool pages are the
 * whole product surface here, so the gap between "published" and "findable" is
 * the thing worth closing. One unauthenticated POST does it.
 *
 * The protocol is keyed by a file you host: INDEXNOW_KEY must match a committed
 * `public/<key>.txt` whose only content is the key itself. That file is public
 * by design - it proves control of the host, it is not a secret.
 *
 * Everything here is fire-and-forget. `pingIndexNow` returns void, never throws,
 * and never joins the promise chain a route handler awaits: a search engine
 * being slow or down must never turn a successful publish into a 500.
 */
import { after } from "next/server";
import { SITE_URL } from "@/lib/site";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** Protocol ceiling: at most 10,000 URLs in one submission. */
const MAX_URLS_PER_REQUEST = 10_000;

/** Long enough for a slow edge, short enough to never hold a lambda open. */
const TIMEOUT_MS = 10_000;

/**
 * Path prefixes that are never indexable, so never worth submitting.
 *
 * Deliberately a copy of the `disallow` list in src/app/robots.ts rather than an
 * import: robots.ts returns a Next `MetadataRoute.Robots` object, and reaching
 * into it from a publish path would couple the two. Both lists are short and
 * change together; the pages themselves also carry `robots: { index: false }`,
 * which is what actually enforces it.
 */
const NOINDEX_PREFIXES = ["/admin", "/seoteam", "/preview", "/login", "/api/"];

/**
 * Derived from SITE_URL, the same source src/app/sitemap.ts uses, so the domain
 * lives in exactly one place. Hard-coding it here is how a preview host ends up
 * submitting URLs for the wrong domain.
 */
const ORIGIN = SITE_URL.replace(/\/$/, "");
const HOST = hostOf(ORIGIN);

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/** Is this path something a search engine is allowed to index? */
function isIndexable(pathname: string): boolean {
  return !NOINDEX_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`),
  );
}

/**
 * Turn a path or absolute URL into a canonical absolute URL on this host.
 *
 * Returns null for anything that is not ours. IndexNow rejects the *whole*
 * submission when a single URL's host does not match `host`, so one stray
 * off-site URL would otherwise cost every URL in the batch.
 */
function toAbsolute(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw, `${ORIGIN}/`);
  } catch {
    return null;
  }
  if (url.host !== HOST) return null;
  url.hash = "";
  return isIndexable(url.pathname) ? url.toString() : null;
}

/**
 * Normalise, dedupe and drop the unsubmittable. Exported for the ping script and
 * for tests - the filtering is the part with rules in it.
 */
export function normalizeIndexNowUrls(urls: string | string[]): string[] {
  const list = typeof urls === "string" ? [urls] : urls;
  const seen = new Set<string>();
  for (const u of list) {
    const abs = toAbsolute(u);
    if (abs) seen.add(abs);
  }
  return [...seen];
}

/** Split into submissions the endpoint will accept. */
export function chunkIndexNowUrls(urls: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    out.push(urls.slice(i, i + MAX_URLS_PER_REQUEST));
  }
  return out;
}

export interface IndexNowBatch {
  count: number;
  status: number;
  ok: boolean;
  error?: string;
}

export interface IndexNowSubmission {
  /** URLs actually sent, after normalising and filtering. */
  urls: string[];
  /** One entry per HTTP request made. */
  batches: IndexNowBatch[];
  /** How many inputs were dropped as duplicate, off-host or noindex. */
  skipped: number;
}

/**
 * Submit URLs and report what happened.
 *
 * Unlike `pingIndexNow` this is awaitable and not gated on VERCEL_ENV, so the
 * backfill script can run it from a laptop against production and see the
 * result. It still never throws - failures come back on the batch records.
 */
export async function submitToIndexNow(
  urls: string | string[],
  opts: { key?: string; verbose?: boolean } = {},
): Promise<IndexNowSubmission> {
  const key = (opts.key ?? process.env.INDEXNOW_KEY ?? "").trim();
  const list = typeof urls === "string" ? [urls] : urls;
  const urlList = normalizeIndexNowUrls(list);
  const result: IndexNowSubmission = {
    urls: urlList,
    batches: [],
    skipped: list.length - urlList.length,
  };
  if (!key || !HOST || urlList.length === 0) return result;

  for (const batch of chunkIndexNowUrls(urlList)) {
    result.batches.push(await postBatch(key, batch, opts.verbose ?? false));
  }
  return result;
}

async function postBatch(
  key: string,
  urlList: string[],
  verbose: boolean,
): Promise<IndexNowBatch> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `${ORIGIN}/${key}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    // 200 = accepted. 202 = accepted, key not verified yet. Both are success.
    const ok = res.status === 200 || res.status === 202;
    if (ok) {
      if (verbose) console.log(`IndexNow ${res.status}: ${urlList.length} URL(s)`);
    } else if (res.status === 403 || res.status === 422) {
      // The two statuses that mean the *setup* is wrong rather than the request:
      // 403 = key file missing or its contents do not match the key, 422 = a URL
      // does not belong to the host, or the key fails the schema. Both would
      // otherwise fail silently and permanently, which is the worst way for an
      // indexing integration to break - loud on purpose.
      console.error(
        `IndexNow ${res.status} - check that ${ORIGIN}/${key}.txt exists and contains ` +
          `exactly the key. ${urlList.length} URL(s) were not submitted.`,
      );
    } else {
      console.warn(`IndexNow ${res.status} for ${urlList.length} URL(s).`);
    }
    return { count: urlList.length, status: res.status, ok };
  } catch (err) {
    // Network error or timeout. Nothing worth retrying inline against - the next
    // publish, or the sitemap diff in .github/workflows/indexnow.yml, resubmits.
    const error = err instanceof Error ? err.message : String(err);
    console.warn(`IndexNow request failed (${error}).`);
    return { count: urlList.length, status: 0, ok: false, error };
  }
}

/**
 * Ping IndexNow for one or more URLs. Paths ("/tool/foo") and absolute URLs both
 * work; anything off-host, noindex or duplicate is dropped.
 *
 * A silent no-op unless INDEXNOW_KEY is set *and* this is a production deploy.
 * Preview deploys read the same catalog database, so without the VERCEL_ENV gate
 * every preview build would submit URLs on behalf of the real domain and hand
 * the search engines whatever half-finished state it was testing.
 *
 * Call it and move on. The work is scheduled with Next's `after()` so it
 * survives the response being sent: on serverless a dangling promise is frozen
 * the moment the handler returns, which would make every ping a coin flip.
 * Outside a request scope (scripts, tests) it falls back to a detached promise.
 */
export function pingIndexNow(urls: string | string[]): void {
  if (!process.env.INDEXNOW_KEY) return;
  if (process.env.VERCEL_ENV !== "production") return;

  const urlList = normalizeIndexNowUrls(urls);
  if (urlList.length === 0) return;

  const work = async () => {
    await submitToIndexNow(urlList);
  };

  try {
    after(work);
  } catch {
    // Not inside a request scope. `submitToIndexNow` never throws, so a detached
    // promise here can never become an unhandled rejection.
    void work();
  }
}
