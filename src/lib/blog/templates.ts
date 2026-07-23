import type { PostTemplate } from "@/lib/types";

export interface TemplateDef {
  id: PostTemplate;
  name: string;
  description: string;
  /** Starter body HTML with a sensible heading structure + guidance. */
  body: string;
}

export const POST_TEMPLATES: TemplateDef[] = [
  {
    id: "how-to",
    name: "How-To / Tutorial",
    description: "Step-by-step guide that ranks for 'how to …' queries.",
    body: `<h2>Introduction</h2><p>Briefly explain the problem and what the reader will achieve.</p><h2>What you'll need</h2><ul><li>Prerequisite one</li><li>Prerequisite two</li></ul><h2>Step 1: …</h2><p>Explain the first step clearly.</p><h2>Step 2: …</h2><p>Explain the second step.</p><h2>Conclusion</h2><p>Summarize and add a call to action.</p>`,
  },
  {
    id: "listicle",
    name: "Listicle (Top N …)",
    description: "Ranked list post - great for 'best X' searches.",
    body: `<h2>Introduction</h2><p>Set up the list and why it matters.</p><h2>1. First item</h2><p>Why it's on the list.</p><h2>2. Second item</h2><p>Why it's on the list.</p><h2>3. Third item</h2><p>Why it's on the list.</p><h2>Conclusion</h2><p>Wrap up and recommend a pick.</p>`,
  },
  {
    id: "comparison",
    name: "Comparison / X vs Y",
    description: "Head-to-head comparison to capture 'X vs Y' traffic.",
    body: `<h2>Overview</h2><p>Introduce both options.</p><h2>X at a glance</h2><p>Key strengths of the first option.</p><h2>Y at a glance</h2><p>Key strengths of the second option.</p><h2>Head-to-head</h2><p>Compare on price, features, and use case.</p><h2>Verdict</h2><p>Who should pick which, and why.</p>`,
  },
  {
    id: "review",
    name: "Product / Service Review",
    description: "In-depth review with pros, cons, and a verdict.",
    body: `<h2>What is it?</h2><p>Introduce the product or service.</p><h2>Key features</h2><ul><li>Feature one</li><li>Feature two</li></ul><h2>Pros and cons</h2><p><strong>Pros:</strong> …</p><p><strong>Cons:</strong> …</p><h2>Pricing</h2><p>Break down the plans.</p><h2>Verdict</h2><p>Final recommendation.</p>`,
  },
  {
    id: "news",
    name: "News / Update",
    description: "Timely announcement or industry update.",
    body: `<h2>The news</h2><p>Lead with what happened.</p><h2>Why it matters</h2><p>Explain the impact.</p><h2>What's next</h2><p>What to expect going forward.</p>`,
  },
  {
    id: "generic",
    name: "Generic Article",
    description: "Flexible structure for any topic.",
    body: `<h2>Introduction</h2><p>Start writing here…</p><h2>Section</h2><p>Add your content.</p><h2>Conclusion</h2><p>Wrap up.</p>`,
  },
];

export function templateById(id: string): TemplateDef | undefined {
  return POST_TEMPLATES.find((t) => t.id === id);
}
