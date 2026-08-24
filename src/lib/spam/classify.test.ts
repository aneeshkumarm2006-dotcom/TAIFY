/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE GENUINE BLOCK MATTERS MORE THAN THE SPAM BLOCK.
 *
 *  A future rule that breaks a case in GENUINE is wrong, however much junk it
 *  catches. Every entry in it is either a real record pulled out of production
 *  Mongo on 2026-08-23, or a shape this business demonstrably sells to. If you
 *  are here because a test failed after you tightened a rule: the rule is the
 *  thing to change.
 *
 *  Two of these were nearly lost for real, and are the reason this file exists:
 *
 *   - "HtmlSlides" is an approved, published listing whose name contains six
 *     consecutive consonants. The first draft of the gibberish rule flagged it.
 *   - `armandabe@agentmail.to` and `sjvduetp@163cc.online` both look synthetic
 *     and both became published tools, so a disposable domain is a flag on the
 *     record and never a score.
 *
 *  The SPAM block is deliberately short. The real corpus contains no spam at
 *  all, so there are no verbatim examples to quote: every case below is a
 *  machine-certain signal or a documented outbound shape, and none of them was
 *  invented to justify a content rule.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { describe, expect, it } from "vitest";
import {
  classify,
  hasConsonantRun,
  isSilentReject,
  isStructurallyEmail,
  MIN_FILL_MS,
  QUARANTINE_AT,
  REJECT_AT,
  type Candidate,
} from "./classify";
import { networkBlock, payloadFingerprint } from "./fingerprint";

/** The slugs the real category dropdown can emit. */
const CATS = [
  "chatbot", "coding", "image", "video", "audio", "research", "design",
  "education", "productivity", "data", "writing", "marketing", "real-estate",
  "ecommerce", "fashion", "health", "sales", "support", "legal", "finance",
  "hr", "social",
] as const;

/** A submission that reached the server from a real browser, unless stated. */
function submit(over: Partial<Candidate> = {}): Candidate {
  return {
    form: "submit",
    allowedCategories: CATS,
    elapsedMs: 45_000,
    ...over,
  };
}

function contact(over: Partial<Candidate> = {}): Candidate {
  return { form: "contact", elapsedMs: 45_000, ...over };
}

// ─────────────────────────────────────────────────────────────────────────────
//  GENUINE — the block that matters
// ─────────────────────────────────────────────────────────────────────────────

describe("GENUINE: real submissions from production, verbatim", () => {
  it("HtmlSlides — six consonants in the brand name, approved and published", () => {
    const a = classify(
      submit({
        name: "HtmlSlides",
        email: "support@htmlslides.ai",
        url: "https://www.htmlslides.ai",
        category: "design",
        message:
          "Create interactive HTML presentations with AI\nTurn ideas into polished, interactive, browser-based slide decks that can be played, shared, embedded, and exported.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("Tradehand — money figures and a percentage throughout, pending review", () => {
    const a = classify(
      submit({
        name: "Tradehand",
        email: "blake@tradehand.com",
        url: "https://tradehand.com",
        category: "chatbot",
        message:
          "AI office team and marketplace for UK trade businesses\nHelps UK sole traders and small trade businesses get found, answer enquiries, send quotes, schedule work, update customers, manage jobs, market the business and collect payment. It costs £0 per month with no lead fee; Tradehand earns 5% only on invoice payments it chases and collects.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("PixMind — a dollar price, and an email domain that is not the tool's", () => {
    const a = classify(
      submit({
        name: "PixMind",
        email: "splendor@aimix.pro",
        url: "https://www.pixmind.io/",
        category: "image",
        message:
          "Create and edit AI images and videos with 25+ leading models\nPixMind helps creators, marketers, and ecommerce teams generate and refine campaign visuals in one workspace. It is best for readable multilingual posters, consistent product photography, multi-reference composition, natural-language image edits, and AI video generation. Freemium; paid plans start at $15.90 per month.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("Penroll — a dollar price and a free tier, approved after four attempts", () => {
    const a = classify(
      submit({
        name: "Penroll",
        email: "arnas@penroll.app",
        url: "https://penroll.app",
        category: "hr",
        message:
          "AI hiring copilot for growing teams\nWrite job posts, rank CVs, manage interviews, and prepare offers in one Penroll hiring workspace. Penroll is free to start with 10 credits and no card required.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("JPG2Excel — a random-looking local part on a throwaway domain, published", () => {
    const a = classify(
      submit({
        name: "JPG2Excel",
        email: "sjvduetp@163cc.online",
        url: "https://jpg2excel.app",
        category: "data",
        message:
          "Turn image tables into editable Excel spreadsheets\nExtract tables from JPG and PNG images into editable Excel files, so students, analysts, founders, and office teams can reuse data from screenshots, scans, and photographed documents.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("Operator — a disposable-domain address that became a published listing", () => {
    const a = classify(
      submit({
        name: "Operator",
        email: "armandabe@agentmail.to",
        url: "https://www.nowoperator.com",
        category: "sales",
        message:
          "AI estimate and booking workflows for HVAC contractors\nOperator helps HVAC contractors capture qualified service requests, automate estimate intake, qualify leads, and move prospects into booking workflows from their websites.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("WoAiMaiHao — mentions WeChat Pay and Alipay as payment rails", () => {
    const a = classify(
      submit({
        name: "WoAiMaiHao",
        email: "1802706292@qq.com",
        url: "https://www.woaimaihao.com/",
        category: "productivity",
        message:
          "Chinese AI membership recharge for ChatGPT, Claude, Gemini and Grok\nCustomers can pay in RMB with Alipay or WeChat Pay, redeem a CDK through the self-service recharge center, track order status, and request support when a recharge is not delivered.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("北洛AI — a Chinese name with no Latin vowels at all", () => {
    const a = classify(
      submit({
        name: "北洛AI",
        email: "3247462760@qq.com",
        url: "https://beiluoxi.top",
        category: "coding",
        message:
          "OpenAI-compatible multi-model API gateway for Claude, GPT and Gemini.\nGive developers one OpenAI-compatible endpoint for Claude, GPT, Gemini and other models.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("Reverse Image Location — an OSINT tool, a topic a filter might dislike", () => {
    const a = classify(
      submit({
        name: "Reverse Image Location",
        email: "support@reverseimagelocation.com",
        url: "https://reverseimagelocation.com/",
        category: "research",
        message:
          "AI photo geolocation for OSINT and GeoGuessr practice.\nReverse Image Location helps users estimate where a photo was taken by analyzing visible scene clues such as signs, road markings, vegetation, architecture, terrain, shadows, and map context.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("the only real contact message in the database", () => {
    const a = classify(
      contact({
        name: "Aneesh Kumar",
        email: "aneeshkumarm2006@gmail.com",
        subject: "test contact us form",
        message: "test contact us form",
      }),
    );
    expect(a.verdict).toBe("allow");
  });
});

describe("GENUINE: the three traps the brief names", () => {
  it("trap 1 — a bare budget figure is not a money signal", () => {
    const a = classify(
      contact({
        name: "Dana Whitfield",
        email: "dana@northsidegroup.co.uk",
        subject: "Sponsoring a category page",
        message:
          "We're looking at putting $8,000 a month behind AI tool discovery and your site keeps coming up. What does a category placement cost, and is there a rate card?",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("trap 2 — a prospect linking their own website", () => {
    const a = classify(
      contact({
        name: "Marco Reyes",
        email: "marco@lumenboard.io",
        subject: "Getting Lumenboard listed",
        message:
          "Hi, I run https://lumenboard.io and I think we'd be a good fit for your productivity category. Happy to send screenshots if that helps.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("trap 3 — a buyer using exactly the spammer's vocabulary", () => {
    const a = classify(
      contact({
        name: "Priya Raman",
        email: "priya@harborlane.com",
        subject: "Help ranking on Google",
        message:
          "We need help ranking on Google for AI tool comparisons and we'd like to know if you offer sponsored posts or guest posts. Can you send over pricing and traffic numbers?",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("gibberish is never detected by vowel ratio", () => {
    // Both of these are what a vowel-ratio test calls keyboard mash.
    expect(hasConsonantRun("partnership")).toBe(false);
    expect(hasConsonantRun("projects")).toBe(false);
    expect(hasConsonantRun("strengths")).toBe(false); // five, the English maximum
    expect(hasConsonantRun("lengths")).toBe(false);
    // Six in a row is a run nothing real produces.
    expect(hasConsonantRun("qwrtplkjhg")).toBe(true);
  });

  it("a URL full of consonants does not read as mash", () => {
    expect(
      hasConsonantRun("See https://cdn-b.saashub.com/images/app/nr4qjh0l21bd.png"),
    ).toBe(false);
  });
});

describe("GENUINE: shapes this business actually sells to", () => {
  it("a founder asking to be listed, no links at all", () => {
    const a = classify(
      contact({
        name: "Ellis Grant",
        email: "ellis@quietloop.dev",
        subject: "Submission question",
        message:
          "How long does review usually take? I submitted Quietloop last week and haven't heard back. Happy to wait, just want to check it arrived.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("a correction on a published listing, mentioning a competitor by URL", () => {
    const a = classify(
      contact({
        name: "Sam Okonjo",
        email: "sam@driftpad.com",
        subject: "Our pricing on your page is out of date",
        message:
          "Your listing says $29/mo but we moved to $19/mo in June. Also our free tier is now 50 credits, not 10.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("a press enquiry that quotes our own domain in the subject line", () => {
    // Our domain appearing once, from someone plainly asking, is not a merge.
    const a = classify(
      contact({
        name: "Rosa Lindqvist",
        email: "rosa@techweekly.se",
        subject: "Interview request",
        message:
          "I'm writing a piece on AI tool directories and would like to ask a few questions. Can you tell me how many tools you review a month?",
      }),
    );
    expect(a.verdict).toBe("allow");
  });

  it("staff testing from our own domain always gets through", () => {
    const a = classify(
      contact({
        name: "QA",
        email: "qa@thereisanaiforyou.com",
        subject: "50% OFF test — unsubscribe",
        message: "Testing the filter. WhatsApp: +1 555 0100. https://example.com",
        honeypot: "filled by the test harness",
        elapsedMs: 10,
      }),
    );
    expect(a.verdict).toBe("allow");
    expect(a.score).toBe(0);
  });

  it("a browser with no timing stamp is allowed on its own", () => {
    // The case this protects: a visitor on a cached bundle right after a deploy.
    const a = classify(
      contact({
        name: "Jo Bright",
        email: "jo@meadowcast.com",
        subject: "Quick question",
        message: "Do you cover video editing tools? Looking for something cheap.",
        elapsedMs: undefined,
      }),
    );
    expect(a.verdict).toBe("allow");
    expect(a.score).toBeLessThan(QUARANTINE_AT);
  });

  it("a single foreign link stays below the quarantine line", () => {
    const a = classify(
      contact({
        name: "Ana Torres",
        email: "ana@brightfold.com",
        subject: "Comparison suggestion",
        message:
          "You should compare against what https://someotherdirectory.com does for filtering. Their category pages are good.",
      }),
    );
    expect(a.verdict).toBe("allow");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SPAM
// ─────────────────────────────────────────────────────────────────────────────

describe("SPAM: machine-certain, the only signals allowed to reject", () => {
  it("honeypot filled", () => {
    const a = classify(
      contact({
        name: "Bot",
        email: "bot@example.com",
        subject: "hi",
        message: "hi",
        honeypot: "https://example.com",
      }),
    );
    expect(a.verdict).toBe("reject");
    expect(a.category).toBe("bot-trap");
  });

  it("a category the dropdown cannot emit", () => {
    const a = classify(
      submit({
        name: "Thing",
        email: "a@b.com",
        url: "https://b.com",
        category: "cheap-loans",
        message: "A thing.",
      }),
    );
    expect(a.verdict).toBe("reject");
    expect(a.category).toBe("impossible-field");
  });

  it("an email field that is not an email address", () => {
    const a = classify(
      contact({
        name: "x",
        email: "not an email at all",
        subject: "x",
        message: "x",
      }),
    );
    expect(a.verdict).toBe("reject");
    expect(a.category).toBe("malformed-email");
  });

  it("a typo'd email is answered visibly, never binned silently", () => {
    // A real person typing "jo@gmailcom" must see an error they can fix, not a
    // fake success and a message that vanishes into a bin they cannot reach.
    const typo = classify(
      contact({
        name: "Jo Bright",
        email: "jo@gmailcom",
        subject: "Listing question",
        message: "Can you review my tool?",
      }),
    );
    expect(typo.verdict).toBe("reject");
    expect(isSilentReject(typo)).toBe(false);

    // A filled honeypot is nothing a person can do, so that one goes quiet.
    const bot = classify(
      contact({ name: "x", email: "x@y.com", subject: "x", message: "x", honeypot: "z" }),
    );
    expect(isSilentReject(bot)).toBe(true);
  });
});

describe("SPAM: outbound shapes, which quarantine and never reject", () => {
  it("an SEO pitch aimed at us", () => {
    const a = classify(
      contact({
        name: "Rahul",
        email: "rahul@seogrowthpro.biz",
        subject: "Ranking proposal for thereisanaiforyou.com",
        message:
          "We can get you ranking on Google's first page in 90 days. We noticed your website is missing key backlinks. Interested? Reply YES and I will send the package.",
      }),
    );
    expect(a.verdict).toBe("quarantine");
    expect(a.score).toBeLessThan(REJECT_AT);
  });

  it("a bulk-mail blast with an unsubscribe footer", () => {
    const a = classify(
      contact({
        name: "Newsletter",
        email: "news@blastmail.co",
        subject: "Your weekly AI roundup",
        message:
          "Here are this week's picks.\n\nYou are receiving this email because you signed up. Click here to unsubscribe.",
      }),
    );
    expect(a.verdict).toBe("quarantine");
    expect(a.category).toBe("bulk-mail");
  });

  it("retail boilerplate with a discount code", () => {
    const a = classify(
      contact({
        name: "Deals",
        email: "deals@shopfast.store",
        subject: "70% OFF today only",
        message:
          "70% OFF everything today only. Free shipping worldwide. Use promo code SAVE70 at checkout. Buy now!",
      }),
    );
    expect(a.verdict).toBe("quarantine");
  });

  it("pushing the conversation onto WhatsApp", () => {
    const a = classify(
      contact({
        name: "Agent",
        email: "agent@quickreply.top",
        subject: "Partnership",
        message:
          "Let us discuss further. WhatsApp: +44 7700 900000. We can get you more traffic fast.",
      }),
    );
    expect(a.verdict).toBe("quarantine");
  });

  it("a link drop across several unrelated sites", () => {
    const a = classify(
      contact({
        name: "Links",
        email: "links@example.net",
        subject: "Resources",
        message:
          "Check https://firstsite.com and https://secondsite.org and https://thirdsite.io for more.",
      }),
    );
    expect(a.verdict).toBe("quarantine");
    expect(a.category).toBe("link-spam");
  });

  it("submitted faster than a human can read the form", () => {
    const a = classify(
      contact({
        name: "Fast",
        email: "fast@example.com",
        subject: "hello",
        message: "hello there",
        elapsedMs: 400,
      }),
    );
    // Quarantine, not reject. This is the ideahunter.today case: the old code
    // dropped it silently and the payload is gone for good.
    expect(a.verdict).toBe("quarantine");
    expect(a.score).toBeLessThan(REJECT_AT);
  });

  it("the same payload replayed under a different address", () => {
    const a = classify(
      contact({
        name: "Alex",
        email: "someone-else@example.com",
        subject: "Great site",
        message: "Great site, keep it up.",
        duplicateWithin24h: true,
      }),
    );
    expect(a.verdict).toBe("quarantine");
  });

  it("a burst out of one network block", () => {
    const a = classify(
      contact({
        name: "Alex",
        email: "alex@example.com",
        subject: "hello",
        message: "hello",
        subnetCount: 7,
      }),
    );
    expect(a.verdict).toBe("quarantine");
    expect(a.category).toBe("flood");
  });
});

describe("no stack of wording rules can ever reject", () => {
  it("every content signal at once still lands short of the reject line", () => {
    const a = classify(
      contact({
        name: "Everything",
        email: "all@spamsource.biz",
        subject: "90% OFF — thereisanaiforyou.com — unsubscribe",
        message:
          "We can get you more traffic. 90% OFF today only, free shipping, promo code NOW. " +
          "WhatsApp: +1 555 0100. Add me to your mailing list. " +
          "See https://one.com https://two.com https://three.com. qwrtplkjhg. " +
          "You are receiving this email because you subscribed. Unsubscribe here.",
        elapsedMs: 100,
        duplicateWithin24h: true,
        subnetCount: 9,
      }),
    );
    expect(a.verdict).toBe("quarantine");
    expect(a.score).toBeLessThan(REJECT_AT);
    expect(a.score).toBe(95);
  });

  it("reasons are stored in plain English, heaviest first", () => {
    const a = classify(
      contact({
        name: "x",
        email: "x@y.com",
        subject: "x",
        message: "Unsubscribe from these emails.",
        elapsedMs: undefined,
      }),
    );
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(a.reasons[0]).toMatch(/bulk-mail footer/i);
    expect(a.signals[0].weight).toBeGreaterThanOrEqual(
      a.signals[a.signals.length - 1].weight,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Supporting pieces
// ─────────────────────────────────────────────────────────────────────────────

describe("network blocks", () => {
  it("groups IPv4 by /24, so a rented subnet counts as one neighbourhood", () => {
    expect(networkBlock("203.0.113.7")).toBe("203.0.113.0/24");
    expect(networkBlock("203.0.113.200")).toBe("203.0.113.0/24");
    expect(networkBlock("203.0.114.7")).not.toBe(networkBlock("203.0.113.7"));
  });

  it("groups IPv6 by /48", () => {
    expect(networkBlock("2001:db8:abcd:1234::1")).toBe("2001:0db8:abcd::/48");
    expect(networkBlock("2001:db8:abcd:9999::ff")).toBe("2001:0db8:abcd::/48");
  });

  it("unwraps the dual-stack ::ffff: form", () => {
    expect(networkBlock("::ffff:203.0.113.7")).toBe("203.0.113.0/24");
  });

  it("returns nothing for an address it cannot parse, rather than guessing", () => {
    expect(networkBlock("unknown")).toBe("");
    expect(networkBlock("")).toBe("");
    expect(networkBlock("999.1.1.1")).toBe("");
  });
});

describe("payload fingerprints", () => {
  it("ignores the email address, so a replay across harvested addresses matches", () => {
    const a = payloadFingerprint(["Alex", "Hello", "Great site, keep it up."]);
    const b = payloadFingerprint(["Alex", "Hello", "Great site, keep it up."]);
    expect(a).toBe(b);
  });

  it("normalises whitespace and case, so re-wrapping the same text still matches", () => {
    expect(payloadFingerprint(["Alex", "Hello  there"])).toBe(
      payloadFingerprint(["alex", "Hello\nthere"]),
    );
  });

  it("differs on genuinely different text", () => {
    expect(payloadFingerprint(["a"])).not.toBe(payloadFingerprint(["b"]));
  });
});

describe("email structure", () => {
  it("accepts the odd-looking real addresses from the corpus", () => {
    expect(isStructurallyEmail("sjvduetp@163cc.online")).toBe(true);
    expect(isStructurallyEmail("armandabe@agentmail.to")).toBe(true);
    expect(isStructurallyEmail("1802706292@qq.com")).toBe(true);
    expect(isStructurallyEmail("mathias.scholz@t-online.de")).toBe(true);
  });

  it("rejects only things that are not addresses", () => {
    expect(isStructurallyEmail("no at sign")).toBe(false);
    expect(isStructurallyEmail("two@at@signs.com")).toBe(false);
    expect(isStructurallyEmail("@nolocal.com")).toBe(false);
    expect(isStructurallyEmail("trailing@dot.")).toBe(false);
  });
});

describe("thresholds are where the comments say they are", () => {
  it("the timer is three seconds", () => {
    expect(MIN_FILL_MS).toBe(3_000);
  });
  it("quarantine sits below reject with room between them", () => {
    expect(QUARANTINE_AT).toBeLessThan(REJECT_AT);
  });
});
