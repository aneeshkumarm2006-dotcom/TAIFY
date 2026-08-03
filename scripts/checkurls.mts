// Visit each tool URL in a real browser and report the final URL after redirects.
import { chromium } from "playwright";
import { TOOLS } from "../src/data/tools";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
});

function host(u: string) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}

const only = new Set(process.argv.slice(2));
const targets = TOOLS.filter((t) => only.size === 0 || only.has(t.slug));

for (const t of targets) {
  const page = await ctx.newPage();
  let final = "";
  try {
    await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1200);
    final = page.url();
  } catch {
    final = "(load error)";
  }
  await page.close();

  const sameHost = host(final) === host(t.url);
  const badPath = /help\.|discontinu|shutdown|sunset|\/support|not-found|\/404/i.test(final);
  if (!sameHost || badPath || final === "(load error)") {
    console.log(`FLAG ${t.slug}\n   from: ${t.url}\n   ->    ${final}`);
  }
}

await browser.close();
console.log("done");
