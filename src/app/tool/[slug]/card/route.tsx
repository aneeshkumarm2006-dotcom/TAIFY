import { ImageResponse } from "next/og";
import { getCategoryById, getTool } from "@/lib/data";
import { SITE_NAME } from "@/lib/site";
import { costChip } from "@/lib/utils";

/**
 * A tool's product image, drawn from its own listing, for when there is no
 * screenshot to serve.
 *
 * Every Product node has to carry an `image` - Google's merchant-listing report
 * marks one without as invalid, which is what took 205 items on the category
 * pages out of every product experience in Search. 232 of 233 tools have a real
 * homepage capture under /shots. This route exists for the remainder: a site
 * that will not render under headless Chrome (adobe.com/podcast paints nothing
 * at all), and any listing approved through /submit with a logo and no
 * screenshot, which submissions/draft.ts explicitly allows.
 *
 * It is a route rather than an `opengraph-image.tsx` on purpose. File-based
 * metadata outranks the metadata object, so the convention file would silently
 * replace the real screenshot in every tool page's og:image with this drawing -
 * a worse social card, and one nobody asked for. Under /tool it is also
 * crawlable, which anything under /api is not (see app/robots.ts).
 *
 * Colours are the design-system tokens from globals.css rather than the purple
 * of the site-wide card, because this one sits next to tool cards in a SERP and
 * has to look like the site it came from.
 */
export const revalidate = 86_400;

const PAPER = "#fbfaf7";
const CARD = "#ffffff";
const INK = "#1a1712";
const INK_SOFT = "#6b655a";
const LINE = "#e7e1d4";
const ACCENT = "#e8532b";

/** Two lines at 34px is about this many characters at this width. */
const TAGLINE_MAX = 116;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) return new Response("Not found", { status: 404 });

  const category = await getCategoryById(tool.category);
  const tagline =
    tool.tagline.length > TAGLINE_MAX
      ? `${tool.tagline.slice(0, TAGLINE_MAX).replace(/[\s,;:.-]+$/, "")}…`
      : tool.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 56,
          background: PAPER,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: "56px 64px",
            borderRadius: 28,
            border: `2px solid ${LINE}`,
            background: CARD,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 132,
                height: 132,
                borderRadius: 32,
                background: tool.color,
                color: "#ffffff",
                fontSize: 58,
                fontWeight: 800,
                letterSpacing: -2,
              }}
            >
              {tool.mark}
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: INK }}>
              {SITE_NAME}
              <span style={{ color: ACCENT }}>.</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 44,
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: -3,
              color: INK,
            }}
          >
            {tool.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 34,
              lineHeight: 1.35,
              color: INK_SOFT,
            }}
          >
            {tagline}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "auto",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 26,
                letterSpacing: 1,
                color: INK_SOFT,
              }}
            >
              {tool.code} · {category?.name ?? tool.category}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 26px",
                borderRadius: 999,
                border: `2px solid ${LINE}`,
                fontSize: 26,
                fontWeight: 700,
                color: ACCENT,
              }}
            >
              real cost {costChip(tool.costPerMonth, tool.billing)}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Long, immutable-ish caching: the card only changes when the listing
        // does, and Googlebot refetches it on its own schedule anyway.
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
