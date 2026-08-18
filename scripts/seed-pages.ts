/**
 * Seed / update hand-written custom pages in the MongoDB `pages` collection.
 * Run with:  pnpm pages:seed
 * Requires MONGODB_URI in .env.local (…/taify names the database).
 *
 * Custom pages normally come out of the admin editor, which is fine for one-off
 * copy but leaves an SEO landing page with no version history and no way to
 * rebuild it. Anything defined here is the source of truth in git; the script
 * upserts by `key`, so re-running it republishes the current copy and never
 * touches a page it does not define. `createdAt` on an existing page is kept.
 */
import { config } from "dotenv";
// Next.js keeps secrets in .env.local; load it (then .env as fallback).
config({ path: ".env.local" });
config();
import { MongoClient } from "mongodb";
import type { Page } from "../src/lib/pages/types";
import { RESERVED } from "../src/lib/pages/reserved";

/** External tool link. No rel="nofollow" — see the note in site-footer.tsx. */
const out = (href: string, label: string) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

const twoPersonConversation: Page = {
  key: "page:ai-two-person-conversation-generators",
  type: "custom",
  slug: "ai-two-person-conversation-generators",
  title: "AI Two Person Conversation Generator",
  metaTitle: "AI Two Person Conversation Generators | There Is An AI For You",
  excerpt:
    "Discover AI two person conversation generators for dialogue, roleplay, video scripts, storytelling, and realistic back-and-forth conversations.",
  intro:
    "Most AI chat tools are built for one person talking to an AI. A two person conversation generator does something different: it writes both sides of the exchange, with two separate characters, personalities, and voices.\n\n" +
    "That is what you want for roleplay, video scripts, podcasts, storytelling, language practice, and anywhere else the output has to sound like two people rather than one voice split in half.",
  blocks: [
    {
      id: "at-a-glance",
      type: "table",
      heading: "At a glance",
      columns: ["Tool", "Best for"],
      rows: [
        ["SiteSpeakAI", "Generating written two-person dialogue"],
        ["DramaSo", "Screenplay and video scripts"],
        ["VoisLabs", "Two-person AI audio"],
        ["JoggAI", "Two-person AI videos"],
        ["JoyPix", "Two-character dialogue with lip-sync"],
      ],
    },
    {
      id: "picks",
      type: "richtext",
      html: [
        "<h2>Best AI two person conversation generators</h2>",
        "<p>These five are grouped by what comes out the other end: text, audio, or video. Pick the format first, because a tool that writes excellent dialogue cannot speak it, and a tool that animates two avatars expects you to bring the script.</p>",

        "<h3>SiteSpeakAI Dialogue Generator</h3>",
        "<p>A free browser tool that takes two character descriptions and a scene, then writes the dialogue between them. It is aimed at screenwriters, game developers, and novelists, so it handles branching NPC conversations and finding a character's voice rather than just producing polite small talk. Detail is what makes it work: speech patterns, mood, and backstory in the character description all come back in the output.</p>",
        "<p><strong>Best for:</strong> written dialogue you will edit yourself.</p>",
        `<p>${out("https://sitespeak.ai/tools/dialogue-generator", "Try SiteSpeakAI &rarr;")}</p>`,

        "<h3>DramaSo</h3>",
        "<p>Built for vertical short drama rather than dialogue in the abstract. You give it characters, a setting, and a goal, and it returns a two-person scene in screenplay form, with beat sheets and an audio-first timeline for hearing the lines before anything is rendered. Output is 9:16, which tells you who it is for: TikTok, Reels, and Shorts.</p>",
        "<p><strong>Best for:</strong> short-form video scripts and screenplay formatting.</p>",
        `<p>${out("https://drama.so/", "Try DramaSo &rarr;")}</p>`,

        "<h3>VoisLabs</h3>",
        "<p>The step after the script. Its multi-voice dialogue mode takes a conversation with speaker labels, lets you assign a different voice to each speaker, and returns one stitched audio file instead of two clips you have to edit together. Aimed at podcast episodes, interview audio, and training simulations, and it covers a wide set of languages including several Indian ones.</p>",
        "<p><strong>Best for:</strong> turning a two-person script into audio.</p>",
        `<p>${out("https://www.voislabs.com/features/multi-voice-dialogue", "Try VoisLabs &rarr;")}</p>`,

        "<h3>JoggAI</h3>",
        "<p>Generates the whole conversation as video. You choose two avatars, give it a prompt, a link, or a file, and it writes and performs the dialogue with lip-sync in 50+ languages. Scenes can put both avatars on screen together, split the frame, or stage a remote call. It is the least hands-on option here, which cuts both ways: fast, but you are working with its avatars rather than your own footage.</p>",
        "<p><strong>Best for:</strong> two-person videos made from scratch.</p>",
        `<p>${out("https://www.jogg.ai/tools/dialogue-video-generator/", "Try JoggAI &rarr;")}</p>`,

        "<h3>JoyPix</h3>",
        "<p>Starts from an image instead of an avatar library. Upload a photo with two people in it, give each of them an audio track or a cloned voice, and it animates both sides with lip-sync, head movement, and expressions rather than a moving mouth on a still face. Voice cloning needs about ten seconds of sample audio, and it handles 40+ languages.</p>",
        "<p><strong>Best for:</strong> putting a conversation into a photo you already have.</p>",
        `<p>${out("https://www.joypix.ai/app/ai-dialogue-video-generator/", "Try JoyPix &rarr;")}</p>`,

        '<p>None of these five are TAIFY listings yet, so none of them carry a verified price badge. If you would rather start from tools we have checked ourselves, the <a href="/category/writing">writing</a>, <a href="/category/audio">audio and voice</a>, and <a href="/category/video">video</a> categories are the closest neighbours.</p>',
      ].join(""),
    },
    {
      id: "how-to",
      type: "guide",
      heading: "How to generate a two person conversation with AI",
      steps: [
        {
          title: "Give each person a name and a job",
          body: "A generic prompt returns two versions of the same polite assistant. Names, roles, and ages are the cheapest way to pull the two voices apart.",
        },
        {
          title: "Give them something to disagree about",
          body: "Conversations only sound real when both sides want different things. State the disagreement and what each person is trying to get out of it.",
        },
        {
          title: "Set the format and the length",
          body: "Ask for screenplay format, chat format, or a podcast transcript, and say roughly how many exchanges you want. Otherwise you get whatever the model defaults to and reformat it by hand afterwards.",
        },
        {
          title: "Tell it not to write symmetrically",
          body: "Left alone, models give both characters lines of the same length that alternate perfectly. Ask for interruptions, uneven turns, and one person talking more than the other.",
        },
      ],
    },
    {
      id: "example-prompt",
      type: "callout",
      variant: "tip",
      title: "A prompt that works",
      body: "Create a conversation between Sarah, a practical marketing manager, and James, a creative designer. They disagree about a new advertising campaign. Give them different personalities and speaking styles, and make the conversation sound natural rather than repetitive.",
    },
    {
      id: "what-to-look-for",
      type: "richtext",
      html: [
        "<h2>What to look for</h2>",
        "<p>Most of these tools demo well and differ in the details. The ones that matter:</p>",
        "<ul>",
        "<li><strong>Distinct personalities.</strong> Can you actually tell the two characters apart in the output, or is it one voice with two labels?</li>",
        "<li><strong>Natural dialogue.</strong> Watch for perfectly alternating turns of equal length. Real conversation is lumpier than that.</li>",
        "<li><strong>Custom prompts.</strong> Fixed templates run out fast once you want a specific scene.</li>",
        "<li><strong>Length and tone control.</strong> A tool that only writes 200-word exchanges is no use for a full episode.</li>",
        "<li><strong>Script formatting.</strong> Screenplay, chat, or transcript output saves a reformatting pass later.</li>",
        "<li><strong>Voice generation, if you need it.</strong> Text-only tools stop at the script, so check whether you will need a second tool for audio or video.</li>",
        "</ul>",
        '<p>Still weighing it up? Describe the job in a sentence on <a href="/match">AI Match</a> and you get three suggestions back with reasons, or work through <a href="/browse">the catalog</a> yourself.</p>',
      ].join(""),
    },
    {
      id: "faq",
      type: "faq",
      heading: "FAQ",
      items: [
        {
          q: "What is an AI two person conversation generator?",
          a: "It is an AI tool that writes a scripted conversation between two speakers or characters, generating both sides rather than replying to you. Some stop at the text; others turn it into audio or video with a separate voice for each speaker.",
        },
        {
          q: "Can ChatGPT generate a two person conversation?",
          a: "Yes. Any general assistant will do it if you describe both characters, their personalities, and the situation they are in. A dedicated generator mainly saves you re-typing that setup every time, and formats the output as a script.",
        },
        {
          q: "What can I use AI-generated conversations for?",
          a: "Roleplay, video scripts, podcasts, storytelling, language practice, social content, training simulations, and NPC dialogue in games. Anywhere you need a back-and-forth rather than a monologue.",
        },
        {
          q: "How do I make AI dialogue sound more natural?",
          a: "Give each character a different personality, speaking style, opinion, and goal, then tell the model to avoid repetitive or symmetrical dialogue. Uneven turn lengths and one character interrupting the other do more for realism than any amount of extra vocabulary.",
        },
        {
          q: "Are there free two person conversation generators?",
          a: "Text tools are usually free or have a workable free tier, since generating a script costs very little. Audio and video generators meter output by the minute, so their free tiers are where you test whether the voices and lip-sync are good enough, not where you produce a finished episode.",
        },
      ],
    },
    {
      id: "cta",
      type: "cta",
      title: "Not sure which one fits your project?",
      body: "One sentence about what you are making. You get three matches back, with reasons and real prices.",
      buttonLabel: "Find my AI",
      buttonHref: "/match",
    },
  ],
  customSchema: "",
  createdAt: "",
  updatedAt: "",
  status: "published",
};

const PAGES: Page[] = [twoPersonConversation];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI set. Add it to site/.env.local.");
    process.exit(1);
  }

  for (const p of PAGES) {
    if (p.type === "custom" && RESERVED.has(p.slug)) {
      console.error(
        `"${p.slug}" is a reserved slug - a real route owns it, so the page would never render.`,
      );
      process.exit(1);
    }
  }

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection<Page>("pages");
  const now = new Date().toISOString();

  for (const page of PAGES) {
    const { key, createdAt, updatedAt, ...fields } = page;
    void createdAt;
    void updatedAt;
    const res = await col.updateOne(
      { key },
      { $set: { ...fields, updatedAt: now }, $setOnInsert: { key, createdAt: now } },
      { upsert: true },
    );
    console.log(
      `${res.upsertedCount ? "created" : "updated"}  ${key}  ->  /${page.slug}`,
    );
  }

  await client.close();
  console.log(`Done. ${PAGES.length} page(s) seeded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
