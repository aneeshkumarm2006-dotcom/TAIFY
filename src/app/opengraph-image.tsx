import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

// Site-wide social preview card. Referenced as OG_IMAGE in lib/site.ts, so
// every page inherits a real 1200x630 image instead of shipping none.
export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #0b0b0f 0%, #16161d 55%, #1d1b2e 100%)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8b7bf7",
          }}
        >
          The field guide to AI
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: -4,
          }}
        >
          {SITE_NAME}
          <span style={{ color: "#8b7bf7" }}>.</span>
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 46, color: "#d7d7e0" }}>
          {SITE_TAGLINE}
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 28, color: "#9a9aa8" }}>
          Describe your task · get the right tool · honest pricing
        </div>
      </div>
    ),
    size,
  );
}
