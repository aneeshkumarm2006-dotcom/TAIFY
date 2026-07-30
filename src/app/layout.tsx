import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/site-footer";
import { ChromeGate } from "@/components/chrome-gate";
import { Ticker } from "@/components/ticker";
import { getSiteSettings } from "@/lib/settings";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TAIFY - There's An AI For You",
  description:
    "The field guide to AI tools. Describe your task, get the right tool - verified daily, honest pricing.",
  verification: {
    google: "6q35g2vs3BxT_r0unwXwwuz1gMUVnfqhsCXs1VuyOsU",
  },
};

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
  const settings = await getSiteSettings();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ChromeGate
          top={
            <>
              <Ticker settings={settings} />
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
