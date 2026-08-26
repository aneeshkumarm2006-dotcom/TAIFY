/**
 * Structured-data smoke test against a running server.
 *
 *   pnpm build && pnpm start
 *   pnpm schema:check                  # defaults to http://localhost:3000
 *   pnpm schema:check https://www.thereisanaiforyou.com
 *
 * This is not a replacement for Google's Rich Results Test — only Google can say
 * whether a page is *eligible* for anything. It catches the failures that ship
 * silently and that no validator flags: a dangling @id reference, a breadcrumb
 * that skips a position, a preview host leaking into a canonical, and above all a
 * pros/cons string that stopped matching the text on the page. Google requires
 * "the text in the structured data must match the text on your page", and a
 * mismatch kills the rich result while still validating perfectly.
 */

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/browse",
  "/categories",
  "/category/coding",
  "/ai-for-doctors",
  "/tool/chatgpt",
  "/tool/midjourney",
  "/compare",
  "/match",
  "/submit",
  "/blog",
];

/**
 * Ids that legitimately point at an entity defined on a different page.
 *
 * A post's `mentions` names the tools it discusses, and those tools are defined
 * on /tool/<slug>, not here — that is the whole point of the reference. Anything
 * else that dangles is a bug.
 */
const CROSS_PAGE_ID = /\/(tool|blog)\/[a-z0-9-]+#(product|post)$/;

type Node = Record<string, unknown>;

let failures = 0;
let checks = 0;

function fail(route: string, msg: string) {
  failures += 1;
  console.error(`  ✗ ${route}  ${msg}`);
}
function pass(msg: string) {
  checks += 1;
  console.log(`  ✓ ${msg}`);
}

/** Every JSON-LD block on the page, flattened out of its @graph. */
function extract(html: string): { blocks: unknown[]; nodes: Node[] } {
  const blocks: unknown[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) blocks.push(JSON.parse(m[1]));

  const nodes: Node[] = [];
  for (const b of blocks) {
    const graph = (b as Node)["@graph"];
    if (Array.isArray(graph)) nodes.push(...(graph as Node[]));
    else if (Array.isArray(b)) nodes.push(...(b as Node[]));
    else nodes.push(b as Node);
  }
  return { blocks, nodes };
}

/** Every {"@id": …} reference anywhere in a node, however deeply nested. */
function refsIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) refsIn(v, out);
  } else if (value && typeof value === "object") {
    const o = value as Node;
    const keys = Object.keys(o);
    // A lone @id is a reference; an @id alongside other keys is a definition.
    if (keys.length === 1 && keys[0] === "@id" && typeof o["@id"] === "string") {
      out.push(o["@id"] as string);
    } else {
      for (const v of Object.values(o)) refsIn(v, out);
    }
  }
  return out;
}

function walk(value: unknown, visit: (n: Node) => void) {
  if (Array.isArray(value)) {
    for (const v of value) walk(v, visit);
  } else if (value && typeof value === "object") {
    visit(value as Node);
    for (const v of Object.values(value as Node)) walk(v, visit);
  }
}

const typeOf = (n: Node): string[] => {
  const t = n["@type"];
  return Array.isArray(t) ? (t as string[]) : t ? [t as string] : [];
};

/** Visible page text, tags stripped and entities decoded, for the DOM diff. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39|#x27);/g, (_m, e: string) =>
      ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'" })[e] ?? " ",
    )
    .replace(/\s+/g, " ");
}

async function checkRoute(route: string) {
  console.log(`\n${route}`);
  const res = await fetch(`${BASE}${route}`);
  if (!res.ok) {
    fail(route, `HTTP ${res.status}`);
    return;
  }
  const html = await res.text();

  let blocks: unknown[];
  let nodes: Node[];
  try {
    ({ blocks, nodes } = extract(html));
  } catch (e) {
    fail(route, `JSON-LD does not parse: ${(e as Error).message}`);
    return;
  }
  if (!nodes.length) {
    fail(route, "no JSON-LD found");
    return;
  }

  for (const b of blocks) {
    if (!(b as Node)["@context"]) fail(route, "a block is missing @context");
  }

  // Node ids defined anywhere on the page, including nested definitions.
  const defined = new Set<string>();
  walk(nodes, (n) => {
    const id = n["@id"];
    if (typeof id === "string" && Object.keys(n).length > 1) defined.add(id);
  });
  for (const id of refsIn(nodes)) {
    if (defined.has(id) || CROSS_PAGE_ID.test(id)) continue;
    fail(route, `@id reference resolves to nothing: ${id}`);
  }

  // Serialisation hygiene and the canonical-host guard.
  const raw = JSON.stringify(nodes);
  if (/"[^"]*":\s*(null)/.test(raw)) fail(route, "a property serialised as null");
  if (raw.includes('""')) fail(route, "a property serialised as an empty string");
  // Images are exempt from the host check: a submitted listing is entitled to
  // host its own screenshot wherever it likes, including on vercel.app, and
  // that says nothing about which domain this page claims to be.
  const hosts = JSON.stringify(nodes, (k, v) => (k === "image" ? undefined : v));
  if (hosts.includes("vercel.app")) fail(route, "a preview host leaked into the graph");

  walk(nodes, (n) => {
    const types = typeOf(n);

    if (types.includes("BreadcrumbList")) {
      const items = (n.itemListElement as Node[]) ?? [];
      if (items.length < 2) fail(route, "breadcrumb has fewer than 2 items");
      items.forEach((it, i) => {
        if (it.position !== i + 1) fail(route, `breadcrumb position ${it.position} out of order`);
        if (!it.name || !it.item) fail(route, "breadcrumb item missing name or item");
      });
    }

    if (types.includes("Product")) {
      if (!n.name) fail(route, "Product missing name");
      const offers = n.offers as Node | undefined;
      if (offers?.price === undefined) fail(route, "Product missing offers.price");
      if (offers && !offers.priceCurrency) fail(route, "Product offer missing priceCurrency");

      // The 2026-08-16 merchant-listing failure, as a test. A Product carrying
      // `offers` is a merchant listing, and one without `image` is invalid -
      // 205 items across the category pages were, silently, for weeks.
      const images = (Array.isArray(n.image) ? n.image : n.image ? [n.image] : []).map(
        String,
      );
      if (!images.length) fail(route, `Product "${n.name}" has no image`);
      for (const src of images) {
        if (!/^https?:\/\//.test(src)) {
          fail(route, `Product image is not an absolute URL: ${src}`);
        }
        // Uncrawlable by Google's own robots.txt, so it can never be a valid
        // product image however well the markup validates.
        if (src.includes("google.com/s2/")) {
          fail(route, `Product image is a favicon lookup: ${src}`);
        }
      }
    }

    if (types.includes("ItemList")) {
      const items = (n.itemListElement as Node[]) ?? [];
      items.forEach((it, i) => {
        if (it.position !== i + 1) fail(route, `ItemList position ${it.position} out of order`);
      });
    }

    if (types.includes("BlogPosting")) {
      if (!n.headline) fail(route, "BlogPosting missing headline");
      if (!n.datePublished) fail(route, "BlogPosting missing datePublished");
      const author = n.author as Node | undefined;
      const authorType = author ? typeOf(author)[0] : undefined;
      // A house byline is an Organization; only a real individual is a Person.
      if (author && authorType && !["Person", "Organization"].includes(authorType)) {
        fail(route, `BlogPosting author typed as ${authorType}`);
      }
    }
  });

  // Pros and cons: at least two statements combined, every one of them present
  // verbatim in the page's own HTML.
  const text = visibleText(html);
  walk(nodes, (n) => {
    if (!typeOf(n).includes("Review")) return;
    const notes = (key: string): string[] => {
      const list = n[key] as Node | undefined;
      if (!list) return [];
      return ((list.itemListElement as Node[]) ?? []).map((it) => String(it.name));
    };
    const statements = [...notes("positiveNotes"), ...notes("negativeNotes")];
    if (statements.length < 2) {
      fail(route, `Review has ${statements.length} statement(s); Google requires 2`);
    }
    if (!n.author) fail(route, "Review missing author");
    for (const s of statements) {
      if (!text.includes(s)) fail(route, `pros/cons text is not on the page: "${s}"`);
    }
    if (statements.length) pass(`${statements.length} pros/cons statements match the page`);
  });

  pass(`${nodes.length} nodes, types: ${[...new Set(nodes.flatMap(typeOf))].join(", ")}`);
}

/**
 * One live article, discovered rather than hard-coded — posts live in Mongo, so
 * any slug written in here would rot the first time one was renamed.
 *
 * Worth knowing before you run this: loading an article increments its `views`
 * counter, same as a real reader would. Nothing on the site renders that number,
 * but it is a write.
 */
async function firstPostRoute(): Promise<string | null> {
  const html = await (await fetch(`${BASE}/blog`)).text();
  return html.match(/\/blog\/[a-z0-9-]+/)?.[0] ?? null;
}

console.log(`Checking structured data at ${BASE}`);
const post = await firstPostRoute();
if (!post) console.log("\n(no published posts found — skipping the article check)");
for (const route of [...ROUTES, ...(post ? [post] : [])]) {
  try {
    await checkRoute(route);
  } catch (e) {
    fail(route, `threw: ${(e as Error).message}`);
  }
}

console.log(
  `\n${failures ? "✗" : "✓"} ${checks} checks passed, ${failures} failure${failures === 1 ? "" : "s"}`,
);
process.exit(failures ? 1 : 0);
