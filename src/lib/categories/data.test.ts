import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryOverride } from "@/lib/db/mongo";

/**
 * The rename rules, against an in-memory stand-in for the `categories`
 * collection.
 *
 * Every case here is one that silently produces a *wrong 200* rather than an
 * error if the rule regresses - a redirect loop, or a URL serving the wrong
 * category to everyone holding an old link. That is the failure mode worth a
 * test: a 404 is loud, a misrouted 200 is not.
 */

let docs: CategoryOverride[] = [];

vi.mock("@/lib/db/mongo", () => ({
  categoriesCollection: async () => ({
    find: () => ({ toArray: async () => docs.map((d) => ({ ...d })) }),
    findOne: async (q: { formerSlugs?: string }) =>
      docs.find((d) => !!q.formerSlugs && d.formerSlugs.includes(q.formerSlugs)) ?? null,
    updateOne: async (
      filter: { id: string },
      update: { $set?: Partial<CategoryOverride>; $setOnInsert?: Partial<CategoryOverride> },
    ) => {
      const existing = docs.find((d) => d.id === filter.id);
      if (existing) Object.assign(existing, update.$set);
      else
        docs.push({
          id: filter.id,
          slug: filter.id,
          formerSlugs: [],
          updatedAt: "",
          ...update.$setOnInsert,
          ...update.$set,
        } as CategoryOverride);
    },
  }),
}));

// Re-imported per test: the read path is wrapped in React cache(), which in
// Next.js is scoped to one request but here would memoise the taxonomy across
// the whole file and hide every rename after the first.
type Mod = typeof import("./data");
let mod: Mod;
const getCategories = (...a: Parameters<Mod["getCategories"]>) => mod.getCategories(...a);
const getCategoryById = (...a: Parameters<Mod["getCategoryById"]>) => mod.getCategoryById(...a);
const categoryPath = (...a: Parameters<Mod["categoryPath"]>) => mod.categoryPath(...a);
const renameCategory = (...a: Parameters<Mod["renameCategory"]>) => mod.renameCategory(...a);
const resolveCategorySlug = (...a: Parameters<Mod["resolveCategorySlug"]>) =>
  mod.resolveCategorySlug(...a);

beforeEach(async () => {
  docs = [];
  vi.resetModules();
  mod = await import("./data");
});

describe("defaults", () => {
  it("resolves every category to slug = id when nothing is overridden", async () => {
    const cats = await getCategories();
    expect(cats).not.toHaveLength(0);
    expect(cats.every((c) => c.slug === c.id)).toBe(true);
  });
});

describe("renameCategory", () => {
  it("keeps the id resolving forever, because the first rename retires it", async () => {
    expect(await renameCategory("coding", "ai-coding-tools")).toMatchObject({ ok: true });

    expect(await categoryPath("coding")).toBe("/category/ai-coding-tools");
    // The promise that no stored document ever needs migrating: `tools.category`
    // still holds "coding", and /category/coding still resolves.
    expect(await resolveCategorySlug("coding")).toEqual({
      kind: "moved",
      to: "ai-coding-tools",
    });
  });

  it("redirects in one hop after two renames, never through the intermediate", async () => {
    await renameCategory("coding", "dev-tools");
    await renameCategory("coding", "ai-dev-tools");

    expect(await resolveCategorySlug("coding")).toEqual({
      kind: "moved",
      to: "ai-dev-tools",
    });
    expect(await resolveCategorySlug("dev-tools")).toEqual({
      kind: "moved",
      to: "ai-dev-tools",
    });
    expect((await getCategoryById("coding"))?.slug).toBe("ai-dev-tools");
  });

  it("does not redirect a slug to itself when renamed back", async () => {
    await renameCategory("coding", "ai-coding-tools");
    await renameCategory("coding", "coding");

    // The loop this prevents: "coding" left in formerSlugs while also being the
    // live slug would 308 /category/coding to /category/coding forever.
    expect(await resolveCategorySlug("coding")).toMatchObject({ kind: "live" });
    expect(await resolveCategorySlug("ai-coding-tools")).toEqual({
      kind: "moved",
      to: "coding",
    });
  });

  it("refuses a slug that is another category's permanent id", async () => {
    await renameCategory("writing", "ai-writing");
    // Without this rule /category/writing would come back as a 200 showing
    // Marketing, silently misrouting every link that predates the rename.
    expect(await renameCategory("marketing", "writing")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("refuses a slug that is another category's live slug", async () => {
    await renameCategory("writing", "ai-writing");
    expect(await renameCategory("marketing", "ai-writing")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("refuses a slug still redirecting to another category", async () => {
    await renameCategory("writing", "ai-writing");
    expect(await renameCategory("marketing", "writing")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("lets a category reclaim a slug it used to hold", async () => {
    await renameCategory("writing", "ai-writing");
    expect(await renameCategory("writing", "writing")).toMatchObject({ ok: true });
  });

  it("rejects an empty or one-character slug", async () => {
    expect(await renameCategory("coding", "  ")).toMatchObject({ ok: false, status: 400 });
    expect(await renameCategory("coding", "x")).toMatchObject({ ok: false, status: 400 });
  });

  it("writes nothing when the slug is unchanged", async () => {
    expect(await renameCategory("coding", "coding")).toMatchObject({
      ok: true,
      unchanged: true,
    });
    expect(docs).toHaveLength(0);
  });
});
