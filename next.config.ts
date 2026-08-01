import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Blog covers live off-domain (Vercel Blob, plus picsum placeholders left
    // over from the seed data). Serving them through next/image proxies them
    // under /_next/image on our own domain, so they stop counting as
    // "disallowed external resources" — picsum's robots.txt is Disallow: / —
    // and get resized and re-encoded on the way through.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      // Every tool logo is a Google favicon lookup, and google.com/robots.txt
      // is "Disallow: /s2" — so hotlinking them made all 95 pages reference an
      // uncrawlable resource. Proxying moves them onto our own domain.
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
