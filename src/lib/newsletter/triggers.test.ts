import { describe, expect, it } from "vitest";
import {
  DISMISS_MS,
  dismissedRecord,
  isDwellPath,
  isExitIntentPath,
  isSuppressed,
  normalizePath,
  parseSuppression,
  subscribedRecord,
  toolSlug,
  triggerForPath,
} from "./triggers";

const NOW = 1_770_000_000_000;

describe("path rules", () => {
  it("normalizes query, hash and trailing slash", () => {
    expect(normalizePath("/browse/")).toBe("/browse");
    expect(normalizePath("/browse?sort=trending")).toBe("/browse");
    expect(normalizePath("/category/coding/#top")).toBe("/category/coding");
    expect(normalizePath("/")).toBe("/");
  });

  it("reads the slug off a tool page only", () => {
    expect(toolSlug("/tool/notion-ai")).toBe("notion-ai");
    expect(toolSlug("/tool/notion-ai/")).toBe("notion-ai");
    expect(toolSlug("/tool")).toBeNull();
    expect(toolSlug("/tool/notion-ai/pricing")).toBeNull();
    expect(toolSlug("/browse")).toBeNull();
  });

  it("dwells on browse and a category, not on the category index", () => {
    expect(isDwellPath("/browse")).toBe(true);
    expect(isDwellPath("/browse?price=free")).toBe(true);
    expect(isDwellPath("/category/coding")).toBe(true);
    // /categories is a link list people cross in three seconds.
    expect(isDwellPath("/categories")).toBe(false);
    expect(isDwellPath("/tool/notion-ai")).toBe(false);
  });

  it("arms exit intent on posts but not on the blog index", () => {
    expect(isExitIntentPath("/blog/best-ai-writing-tools")).toBe(true);
    expect(isExitIntentPath("/blog")).toBe(false);
    expect(isExitIntentPath("/blog/")).toBe(false);
  });

  it("gives every path exactly one rule, or none", () => {
    expect(triggerForPath("/tool/claude")).toBe("tools");
    expect(triggerForPath("/category/design")).toBe("dwell");
    expect(triggerForPath("/blog/how-we-verify")).toBe("exit");
    expect(triggerForPath("/")).toBeNull();
    expect(triggerForPath("/submit")).toBeNull();
    expect(triggerForPath("/ai-for-doctors")).toBeNull();
  });

  it("never fires inside the dashboards", () => {
    for (const path of ["/admin", "/admin/messages", "/seoteam/new", "/login"]) {
      expect(triggerForPath(path)).toBeNull();
    }
  });
});

describe("suppression", () => {
  it("holds a dismissal for 30 days and then lets go", () => {
    const record = dismissedRecord(NOW);
    expect(isSuppressed(record, NOW)).toBe(true);
    expect(isSuppressed(record, NOW + DISMISS_MS - 1)).toBe(true);
    expect(isSuppressed(record, NOW + DISMISS_MS)).toBe(false);
  });

  it("holds a signup forever", () => {
    const record = subscribedRecord(NOW);
    expect(record.until).toBeNull();
    expect(isSuppressed(record, NOW + 100 * DISMISS_MS)).toBe(true);
  });

  it("survives a round trip through storage", () => {
    const record = dismissedRecord(NOW);
    expect(parseSuppression(JSON.stringify(record))).toEqual(record);
  });

  it("treats junk as no record, so a corrupt value cannot lock someone out", () => {
    expect(parseSuppression(null)).toBeNull();
    expect(parseSuppression("")).toBeNull();
    expect(parseSuppression("not json")).toBeNull();
    expect(parseSuppression('{"state":"maybe"}')).toBeNull();
    expect(parseSuppression('{"state":"dismissed","until":"soon"}')).toBeNull();
    expect(isSuppressed(null, NOW)).toBe(false);
  });

  it("accepts a record written without an `at` stamp", () => {
    const parsed = parseSuppression('{"state":"subscribed","until":null}');
    expect(parsed).toEqual({ state: "subscribed", until: null, at: 0 });
  });
});
