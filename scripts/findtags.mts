// Render live pages and report any VISIBLE text that contains literal HTML tags.
import { chromium } from "playwright";

const base = "https://www.thereisanaiforyou.com";
const paths = [
  "/",
  "/browse",
  "/categories",
  "/category/real-estate",
  "/category/hr",
  "/tool/chatgpt",
  "/tool/virtual-staging-ai",
  "/blog",
  "/blog/best-ai-tools-for-real-estate",
  "/match",
  "/compare",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 Chrome/122 Safari/537.36" });

for (const p of paths) {
  const page = await ctx.newPage();
  try {
    await page.goto(base + p, { waitUntil: "networkidle", timeout: 25000 });
    const text: string = await page.evaluate(() => document.body.innerText || "");
    // Any run that looks like a literal HTML tag visible to the user.
    const hits = text.match(/<\/?[a-zA-Z][^>\n]{0,40}>|<>/g) || [];
    const uniq = [...new Set(hits)];
    if (uniq.length) {
      console.log(`\nFLAG ${p}`);
      console.log("  visible tag-like strings:", uniq.slice(0, 12).join("  "));
      // show a little context for the first hit
      const idx = text.indexOf(uniq[0]);
      console.log("  context:", JSON.stringify(text.slice(Math.max(0, idx - 50), idx + 60)));
    } else {
      console.log(`ok   ${p}`);
    }
  } catch (e) {
    console.log(`ERR  ${p}  ${(e as Error).message.slice(0, 50)}`);
  }
  await page.close();
}
await browser.close();
console.log("\ndone");
