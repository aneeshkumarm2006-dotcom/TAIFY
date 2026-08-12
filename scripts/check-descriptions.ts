/**
 * Guard for the meta-description generator.
 *
 * Runs every catalog description through metaDescription() and reports any that
 * come out over the ceiling or ending somewhere a sentence cannot end. The
 * 2026-08-10 audit found 73 of 218 tool pages clipped mid-clause ("…with a
 * capable free tier and"), so this is the check that says the truncation is
 * still landing on clause boundaries.
 *
 *   pnpm tsx scripts/check-descriptions.ts          # catalog (src/data/tools.ts)
 *   pnpm tsx scripts/check-descriptions.ts x.json   # a { slug: description } map
 *
 * Exits non-zero if anything is flagged.
 */
import { readFileSync } from "node:fs";
import { metaDescription } from "../src/lib/site";
import { TOOLS } from "../src/data/tools";

const CEILING = 160;

/**
 * Words that cannot end a sentence. Deliberately a separate list from the one
 * in site.ts — a check that reuses the implementation's own vocabulary would
 * pass by construction.
 */
const HANGING =
  /\b(a|an|the|and|or|but|nor|so|yet|plus|of|in|on|at|to|for|with|by|into|onto|over|under|across|through|between|among|against|about|than|per|via|without|within|upon|toward|towards|during|before|since|until|while|like|as|including|which|who|whom|whose|whether|when|where|how|why|what|is|are|was|were|be|been|being|has|have|had|does|did|can|could|will|would|shall|should|may|might|must|its|their|your|our|his|her|my|this|these|those|each|every|both|either|neither|any|some|no|such|same|other|another|rather|instead)[.]$/i;

const file = process.argv[2];
const rows: Record<string, string> = file
  ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, string>)
  : Object.fromEntries(TOOLS.map((t) => [t.slug, t.description]));

let checked = 0;
let flagged = 0;
const lengths: number[] = [];

for (const [slug, full] of Object.entries(rows)) {
  if (!full) continue;
  const out = metaDescription(full);
  lengths.push(out.length);
  checked += 1;

  const problems: string[] = [];
  if (out.length > CEILING) problems.push(`${out.length} chars`);
  if (!/[.!?]$/.test(out)) problems.push("no full stop");
  if (/[…\-–—,;:/&+]$/.test(out)) problems.push("dangling punctuation");
  // A hanging last word is only a defect when we clipped: if the source itself
  // ends there, the sentence really does end on that word ("…it came from.").
  if (HANGING.test(out) && !full.trim().startsWith(out.slice(0, -1))) {
    problems.push("hanging last word");
  }

  if (problems.length) {
    flagged += 1;
    console.log(`!! ${slug.padEnd(22)} ${problems.join(", ")}\n     ${out}`);
  }
}

const clipped = lengths.filter((n, i) => n < Object.values(rows)[i]?.length).length;
console.log(
  `\nchecked ${checked}  clipped ${clipped}  flagged ${flagged}  ` +
    `length min=${Math.min(...lengths)} max=${Math.max(...lengths)}`,
);
process.exit(flagged ? 1 : 0);
