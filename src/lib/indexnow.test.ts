import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/lib/site";
import {
  chunkIndexNowUrls,
  normalizeIndexNowUrls,
  pingIndexNow,
  submitToIndexNow,
} from "@/lib/indexnow";

/**
 * The failure modes worth a test here are all silent ones.
 *
 * IndexNow answers a bad submission with a 200-shaped protocol error or, worse,
 * accepts it and does nothing, so nothing about a broken ping shows up in the
 * app. The two that cost real indexing: a single off-host URL, which makes the
 * endpoint reject the *entire* batch rather than that one URL, and a noindex URL
 * slipping through, which spends crawl budget teaching Bing that a page it is
 * being asked to index is one it is forbidden to index.
 *
 * The env gate gets the same treatment for the opposite reason: preview deploys
 * read the production catalog, so a gate that regressed would have every preview
 * build submitting URLs on behalf of the real domain.
 */

const ORIGIN = SITE_URL.replace(/\/$/, "");

describe("normalizeIndexNowUrls", () => {
  it("makes paths absolute against the canonical origin", () => {
    expect(normalizeIndexNowUrls("/tool/notion-ai")).toEqual([`${ORIGIN}/tool/notion-ai`]);
    expect(normalizeIndexNowUrls(["/blog", "/browse"])).toEqual([
      `${ORIGIN}/blog`,
      `${ORIGIN}/browse`,
    ]);
  });

  it("accepts absolute URLs already on the host", () => {
    expect(normalizeIndexNowUrls(`${ORIGIN}/category/writing`)).toEqual([
      `${ORIGIN}/category/writing`,
    ]);
  });

  it("dedupes, including a path and its absolute form", () => {
    expect(
      normalizeIndexNowUrls(["/tool/x", `${ORIGIN}/tool/x`, "/tool/x", "/tool/y"]),
    ).toEqual([`${ORIGIN}/tool/x`, `${ORIGIN}/tool/y`]);
  });

  it("drops off-host URLs rather than letting them void the whole batch", () => {
    expect(
      normalizeIndexNowUrls([
        "/tool/keeper",
        "https://evil.example/tool/x",
        "https://taify.vercel.app/tool/x",
      ]),
    ).toEqual([`${ORIGIN}/tool/keeper`]);
  });

  it("drops noindex paths", () => {
    expect(
      normalizeIndexNowUrls([
        "/admin",
        "/admin/tools",
        "/seoteam/posts",
        "/preview/submission/1",
        "/login",
        "/api/match",
      ]),
    ).toEqual([]);
  });

  it("does not treat a longer path that merely starts with the same letters as noindex", () => {
    // "/admin" must not swallow "/administration" or "/ai-for-admins".
    expect(normalizeIndexNowUrls(["/administration", "/ai-for-admins"])).toEqual([
      `${ORIGIN}/administration`,
      `${ORIGIN}/ai-for-admins`,
    ]);
  });

  it("strips fragments and ignores blanks and junk", () => {
    expect(normalizeIndexNowUrls(["/tool/x#pricing", "", "   "])).toEqual([
      `${ORIGIN}/tool/x`,
    ]);
  });
});

describe("chunkIndexNowUrls", () => {
  it("keeps every batch inside the 10,000-URL protocol limit", () => {
    const urls = Array.from({ length: 25_000 }, (_, i) => `${ORIGIN}/tool/${i}`);
    const chunks = chunkIndexNowUrls(urls);
    expect(chunks.map((c) => c.length)).toEqual([10_000, 10_000, 5_000]);
    expect(chunks.flat()).toEqual(urls);
  });

  it("returns nothing for an empty list", () => {
    expect(chunkIndexNowUrls([])).toEqual([]);
  });
});

describe("submitToIndexNow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts the protocol payload with a keyLocation derived from the origin", async () => {
    const res = await submitToIndexNow(["/tool/x", "/browse"], { key: "k3y" });

    expect(res.batches).toEqual([{ count: 2, status: 200, ok: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.indexnow.org/indexnow");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      host: new URL(ORIGIN).host,
      key: "k3y",
      keyLocation: `${ORIGIN}/k3y.txt`,
      urlList: [`${ORIGIN}/tool/x`, `${ORIGIN}/browse`],
    });
  });

  it("reports what it dropped instead of sending it", async () => {
    const res = await submitToIndexNow(
      ["/tool/x", "/tool/x", "/admin", "https://evil.example/x"],
      { key: "k" },
    );
    expect(res.urls).toEqual([`${ORIGIN}/tool/x`]);
    expect(res.skipped).toBe(3);
  });

  it("treats 202 as success — the key is simply not verified yet", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    const res = await submitToIndexNow("/tool/x", { key: "k" });
    expect(res.batches[0].ok).toBe(true);
  });

  it("logs loudly on a 403, which always means the key file is wrong", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const res = await submitToIndexNow("/tool/x", { key: "k" });
    expect(res.batches[0]).toMatchObject({ status: 403, ok: false });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("/k.txt"));
  });

  it("swallows a network failure rather than throwing into the caller", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const res = await submitToIndexNow("/tool/x", { key: "k" });
    expect(res.batches[0]).toMatchObject({ ok: false, status: 0, error: "ECONNRESET" });
  });

  it("sends nothing at all without a key, or with no submittable URLs", async () => {
    expect((await submitToIndexNow("/tool/x", { key: "" })).batches).toEqual([]);
    expect((await submitToIndexNow("/admin", { key: "k" })).batches).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("pingIndexNow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("INDEXNOW_KEY", "");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("is a silent no-op with no key", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => pingIndexNow("/tool/x")).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a silent no-op off production, so preview deploys cannot submit", () => {
    vi.stubEnv("INDEXNOW_KEY", "k");
    for (const env of ["preview", "development", ""]) {
      vi.stubEnv("VERCEL_ENV", env);
      pingIndexNow("/tool/x");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits on production, without the caller awaiting anything", async () => {
    vi.stubEnv("INDEXNOW_KEY", "k");
    vi.stubEnv("VERCEL_ENV", "production");

    // Returns void: a route handler calls this and moves on.
    expect(pingIndexNow(["/tool/x", "/browse"])).toBeUndefined();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.urlList).toEqual([`${ORIGIN}/tool/x`, `${ORIGIN}/browse`]);
  });

  it("does not even schedule work when every URL is filtered out", () => {
    vi.stubEnv("INDEXNOW_KEY", "k");
    vi.stubEnv("VERCEL_ENV", "production");
    pingIndexNow(["/admin/tools", "https://evil.example/x"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
