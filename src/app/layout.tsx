import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/site-footer";
import { ChromeGate } from "@/components/chrome-gate";
import { Ticker } from "@/components/ticker";
import { getSiteSettings } from "@/lib/settings";
import { countTools } from "@/lib/data";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  OG_IMAGE,
  absoluteUrl,
} from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Anchors every relative canonical / OG URL to the canonical domain.
  metadataBase: new URL(SITE_URL),
  // No `template` here on purpose: every page builds a complete, length-checked
  // title that already carries the brand, so a template would append it twice.
  title: `${SITE_NAME} - ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} - ${SITE_TAGLINE}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  verification: {
    google: "6q35g2vs3BxT_r0unwXwwuz1gMUVnfqhsCXs1VuyOsU",
  },
};

// Site-wide entity graph: identifies the publisher and enables the sitelinks
// search box. Page-level schema (SoftwareApplication, BlogPosting, …) layers
// on top of this.
const siteSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") },
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/match?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  },
];

// Prevent a light/dark flash by setting the theme class before paint.
const themeScript = `
(function(){try{
  var t = localStorage.getItem('taify-theme');
  var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, toolCount] = await Promise.all([getSiteSettings(), countTools()]);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ChromeGate
          top={
            <>
              <Ticker settings={settings} toolCount={toolCount} />
              <TopNav />
            </>
          }
          footer={<SiteFooter />}
        >
          {children}
        </ChromeGate>
      </body>
    </html>
  );
}
