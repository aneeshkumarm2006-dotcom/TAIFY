/**
 * Shared spam classifier for every public form on TAIFY.
 *
 * Pure functions, no I/O, no imports from the database or the network, so the
 * same module runs inside a route handler, inside the backfill script, and
 * inside the test suite with nothing mocked.
 *
 * ── Why the rules are as timid as they are ────────────────────────────────────
 *
 * This was designed against the real corpus (22 submissions, 1 contact message,
 * production Mongo, read 2026-08-23), and that corpus contains no spam at all.
 * Every stored submission is a genuine AI product. The only bot-shaped event in
 * the entire history is one `too-fast` line in submitLog for ideahunter.today,
 * and the old code answered it with a silent drop, so the payload is gone and
 * nobody can now say whether it was a bot or a person on a stale bundle.
 *
 * With nothing to tune against, an aggressive content filter would be invented
 * rather than observed, so the scoring is deliberately arranged such that
 * content can never reject. Soft signals are capped below the reject line (see
 * SOFT_CAP): the worst a message can do on its wording is land in quarantine,
 * where a human sees it. Only three machine-certain signals reject, and every
 * one of those is copied to a 30-day bin on the way out.
 */

/** What the caller should do with the submission. */
export type Verdict =
  /** Store, notify, show in the normal inbox. */
  | "allow"
  /** Store and categorise, do not email, show behind the Spam view. */
  | "quarantine"
  /** Keep out of the main table; copy to the blocked bin; answer 200 anyway. */
  | "reject";

export type SpamCategory =
  | "clean"
  | "bot-trap"
  | "impossible-field"
  | "malformed-email"
  | "bulk-mail"
  | "outbound-promo"
  | "off-platform-contact"
  | "link-spam"
  | "keyboard-mash"
  | "duplicate"
  | "flood"
  | "no-browser-proof";

export interface Signal {
  /** Stable machine code, safe to group and count on. */
  code: string;
  /** Points this signal contributes to the score. */
  weight: number;
  /** Plain English, written for the operator reading the Spam view. */
  reason: string;
  category: SpamCategory;
}

export interface Assessment {
  verdict: Verdict;
  /** 0-100. Higher is worse. */
  score: number;
  /** The single category that best describes why, from the heaviest signal. */
  category: SpamCategory;
  /** Plain-English reasons, heaviest first. Stored and shown in the admin. */
  reasons: string[];
  signals: Signal[];
}

/**
 * Everything the classifier looks at.
 *
 * Fields the caller has to do I/O for (duplicate lookups, rate counters) arrive
 * pre-computed as booleans/numbers so this module stays pure.
 */
export interface Candidate {
  form: "contact" | "submit";

  /** Human-written prose. Scored. */
  name?: string;
  email?: string;
  subject?: string;
  message?: string;

  /**
   * The tool's own website, on the submit form only.
   *
   * Never scored as a link. The entire purpose of that form is "send us your
   * URL", so a link here is the product, not a signal. It is used only to
   * recognise the sender's own domain when scoring links found in the prose.
   */
  url?: string;

  /** Value chosen in the category select, submit form only. */
  category?: string;
  /** Slugs the select can actually emit. Anything else came from a script. */
  allowedCategories?: readonly string[];

  /** Hidden trap field. Any content means a machine filled the form. */
  honeypot?: string;

  /**
   * Milliseconds between the form rendering and the POST.
   *
   * `undefined` means the client sent no stamp at all: a direct POST, or a
   * browser running a cached bundle from before the stamp shipped. Those are
   * very different things, so they score differently and neither rejects.
   */
  elapsedMs?: number;

  /** Set by the caller after hashing the human fields and checking the last 24h. */
  duplicateWithin24h?: boolean;
  /**
   * Prior submissions from this exact IP inside the rate window.
   *
   * Not scored. A single address going over its cap is a hard 429 at the route,
   * which is a better answer than a quarantined record: the person gets told,
   * and can come back later.
   */
  ipCount?: number;
  /** Prior submissions from neighbouring addresses in the same /24 or /48. */
  subnetCount?: number;
}

// ── Thresholds ───────────────────────────────────────────────────────────────

/** At or above this, a human looks at it before anyone replies. */
export const QUARANTINE_AT = 50;
/** At or above this, it never reaches the main table. */
export const REJECT_AT = 100;
/**
 * Ceiling on everything except the three machine-certain signals.
 *
 * This is the load-bearing line in the file. It is what guarantees that no
 * stack of wording rules, however many fire at once, can silently destroy a
 * message: content tops out one point short of REJECT_AT.
 */
const SOFT_CAP = 95;

/** Our own domain. Anything from here is staff testing and always gets through. */
export const OWN_DOMAIN = "thereisanaiforyou.com";

/** A human cannot read a form and fill it in faster than this. */
export const MIN_FILL_MS = 3_000;

/**
 * Neighbours inside the rate window before the block itself looks like a flood.
 *
 * Two is a coincidence - an office, a university, a mobile carrier NAT. Three
 * distinct submitters out of one /24 in six hours is a rented subnet.
 */
export const SUBNET_BURST = 3;

// ── Weights ──────────────────────────────────────────────────────────────────

const W = {
  /** Machine-certain. These three, and only these three, can reject. */
  honeypot: 100,
  impossibleSelect: 100,
  malformedEmail: 100,

  /** Alone enough to quarantine. */
  bulkFooter: 60,
  mailingListRequest: 60,
  tooFast: 55,
  duplicate: 55,
  subnetFlood: 55,

  /** Needs company to cross the line. */
  outboundOffer: 45,
  retailBoilerplate: 45,
  offPlatformContact: 45,
  noBrowserProof: 35,
  ownDomainInBody: 35,
  foreignLink: 30,
  consonantRun: 30,
} as const;

// ── Patterns ─────────────────────────────────────────────────────────────────

const URL_RE =
  /\bhttps?:\/\/[^\s<>()"']+|\bwww\.[^\s<>()"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|ai|co|app|dev|xyz|shop|top|info|biz|online|site|store|club|live|me|us|uk|de|cn|ru)\b/gi;

const EMAIL_IN_TEXT_RE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;

/**
 * Bulk-mail footers. A person writing to a contact form never unsubscribes you
 * from anything.
 */
const BULK_FOOTER_RE =
  /\b(?:unsubscribe|opt[- ]?out\s+of\s+(?:these|this|our)|you (?:are )?receiv(?:ed|ing) this (?:email|message) because|to stop receiving|manage your (?:email )?preferences|view this email in your browser)\b/i;

const MAILING_LIST_RE =
  /\b(?:add (?:me|us) to your (?:mailing )?list|subscribe (?:me|us)\b|(?:join|sign up for) our (?:newsletter|mailing list)|added to your (?:email )?list)\b/i;

/**
 * Retail discount boilerplate. Deliberately narrow: it wants the shape of a
 * shop advert, not the presence of money.
 *
 * A bare figure is not a signal and must never become one. The live corpus is
 * full of genuine ones: Tradehand's "£0 per month ... 5% only on invoice
 * payments", PixMind's "$15.90 per month", Penroll's "$19 per month". Every one
 * of those is an approved, published listing.
 */
const RETAIL_RE =
  /\b(?:\d{1,3}\s*%\s*(?:off|discount)|free shipping|today only|limited[- ]time offer|act now|order now|buy now|shop now|(?:discount|coupon|promo)\s+code|lowest prices? (?:online|guaranteed)|money[- ]back guarantee)\b/gi;

/**
 * Somebody moving the conversation off the form and onto a messenger.
 *
 * Requires the platform word next to an actual handle or number. Bare mentions
 * are excluded on purpose: WoAiMaiHao, a real pending submission, describes
 * paying by "Alipay or WeChat Pay", and a rule that fired on the word "WeChat"
 * would flag a genuine listing.
 */
const OFF_PLATFORM_RE =
  /\b(?:whats\s?app|telegram|skype|viber|wechat|weixin|line id)\b\s*(?::|@|\+|\bid\b|\bme\b|\bus\b|\bat\b|\bon\b|\bnumber\b|\bchat\b|\bcontact\b)/i;
/** "WeChat Pay" and "Alipay" are payment rails, not a way to reach the sender. */
const PAYMENT_RAIL_RE = /\b(?:wechat|weixin|ali)\s*pay\b/i;

/**
 * An offer aimed at us, which is the thing that separates a spammer from a
 * customer. Direction, never topic.
 *
 * "We can get you ranking on Google" fires. "We need help ranking on Google"
 * does not, and must not: that is the customer.
 */
const OUTBOUND_OFFER_RE =
  /\b(?:we|i|our team|our company)\s+(?:can|could|will|would|shall)\s+(?:help|get|make|boost|increase|improve|grow|rank|build|provide|offer|deliver|drive|generate|bring)\s+(?:you|your|u|ur)\b/i;

/** Cold-outreach shapes that are unambiguously inbound sales. */
const OUTREACH_RE =
  /\b(?:guest post(?:ing)?|link exchange|link building (?:service|package)|sponsored (?:post|article|content)|do[- ]?follow link|niche edit|reply (?:with )?["']?yes["']?|interested\?\s*(?:reply|let me know)|(?:we|i) (?:noticed|came across|found) your (?:website|site|page))\b/i;

/**
 * Buyer vocabulary. Present purely as a brake: if somebody is clearly asking
 * rather than pitching, the outbound rules stand down. The case this protects
 * is the one that matters, a real enquiry using the same words as a spammer.
 */
const BUYER_RE =
  /\b(?:we need|i need|we're looking|we are looking|i'm looking|i am looking|can you|could you|do you|would you|how much|what does it cost|our budget|my budget|we'd like|we would like|i'd like|i would like|please (?:add|list|review|consider)|is it possible|any chance)\b/i;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Host of a URL-ish string, lowercased, `www.` stripped. "" when unparseable. */
export function hostOf(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * The last two labels of a host, as a rough "same organisation" key.
 *
 * Rough on purpose: it is only ever used to discount a link, and the penalty it
 * guards is 30 points, which is below the quarantine line on its own. Being
 * generous here costs nothing and protects prospects who link themselves.
 */
function baseDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

/** Letters-and-digits key for fuzzy "is this host the company's own?" matching. */
function alnum(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Runs of 6+ consecutive consonants, the only gibberish test used here.
 *
 * A vowel-ratio test is banned. At every threshold that catches real keyboard
 * mash it also catches "partnership" (3 vowels in 11) and "projects" (2 in 8),
 * and both are words a customer writes. English tops out at five in a row
 * ("strengths", "lengths"), so six is a run nothing real produces.
 *
 * URLs, email addresses and any word containing non-ASCII are removed first:
 * the corpus includes a Chinese submission (北洛AI) and a CJK string has no
 * vowels at all by this measure.
 */
export function hasConsonantRun(text: string): boolean {
  const stripped = (text ?? "")
    .replace(URL_RE, " ")
    .replace(EMAIL_IN_TEXT_RE, " ");
  for (const word of stripped.split(/[^A-Za-z]+/)) {
    if (word.length < 6) continue;
    if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(word)) return true;
  }
  return false;
}

/** Every host mentioned in a blob of prose. */
export function linkHostsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of (text ?? "").match(URL_RE) ?? []) {
    const h = hostOf(m);
    if (h && h.includes(".")) out.push(h);
  }
  return out;
}

/**
 * Structural email check, used only to catch a field that is not an address at
 * all. Deliberately loose: turning away a real address is worse than accepting
 * an odd one, and the corpus proves it. `sjvduetp@163cc.online` and
 * `armandabe@agentmail.to` both look synthetic and both became published tools.
 */
export function isStructurallyEmail(v: string): boolean {
  const s = (v ?? "").trim();
  if (!s || /\s/.test(s)) return false;
  const at = s.indexOf("@");
  if (at <= 0 || at !== s.lastIndexOf("@")) return false;
  const domain = s.slice(at + 1);
  return (
    domain.includes(".") &&
    !domain.startsWith(".") &&
    !domain.endsWith(".") &&
    domain.length >= 4
  );
}

/**
 * Whether a rejection should be answered silently, or with an error the sender
 * can act on.
 *
 * Three signals can reject, and they are not equivalent. A filled honeypot and
 * an impossible dropdown value are things no person can produce by typing, so
 * those get the ordinary success response and go quietly to the bin - telling a
 * spammer it was caught only teaches it to try again.
 *
 * A malformed email is different: someone typing "jo@gmailcom" is a real person
 * making a real typo, and answering that with a fake success would lose their
 * message to a bin they will never see. That one gets a 400 saying what is
 * wrong, exactly as the form did before any of this existed.
 */
export function isSilentReject(a: Assessment): boolean {
  return (
    a.verdict === "reject" &&
    a.signals.some(
      (s) => s.code === "honeypot" || s.code === "impossible-select",
    )
  );
}

// ── The classifier ───────────────────────────────────────────────────────────

export function classify(c: Candidate): Assessment {
  const email = (c.email ?? "").trim().toLowerCase();
  const emailDomain = email.split("@")[1] ?? "";

  // Staff testing always gets through, ahead of every rule including the trap.
  // An internal test submission that lands in quarantine teaches us nothing
  // about whether the form works.
  if (emailDomain && baseDomain(emailDomain) === OWN_DOMAIN) {
    return {
      verdict: "allow",
      score: 0,
      category: "clean",
      reasons: ["Sent from our own domain, so it skips every check."],
      signals: [],
    };
  }

  const signals: Signal[] = [];
  const add = (
    code: string,
    weight: number,
    reason: string,
    category: SpamCategory,
  ) => signals.push({ code, weight, reason, category });

  // ── Machine-certain. The only three that can reject. ──────────────────────

  if ((c.honeypot ?? "").trim()) {
    add(
      "honeypot",
      W.honeypot,
      "Filled in the hidden trap field, which is invisible to people and to screen readers.",
      "bot-trap",
    );
  }

  const chosen = (c.category ?? "").trim();
  if (chosen && c.allowedCategories && !c.allowedCategories.includes(chosen)) {
    add(
      "impossible-select",
      W.impossibleSelect,
      `Sent category "${chosen}", which the dropdown on the form cannot produce.`,
      "impossible-field",
    );
  }

  if (email && !isStructurallyEmail(email)) {
    add(
      "malformed-email",
      W.malformedEmail,
      "The email field does not contain an email address.",
      "malformed-email",
    );
  }

  // ── Content. Direction, never topic. ──────────────────────────────────────

  const prose = [c.name, c.subject, c.message].filter(Boolean).join("\n");
  const buyerVoice = BUYER_RE.test(prose);

  if (BULK_FOOTER_RE.test(prose)) {
    add(
      "bulk-footer",
      W.bulkFooter,
      "Carries a bulk-mail footer (unsubscribe / opt-out), so it was sent by a mailing tool.",
      "bulk-mail",
    );
  }

  if (MAILING_LIST_RE.test(prose)) {
    add(
      "mailing-list-request",
      W.mailingListRequest,
      "Asks to be added to a mailing list rather than asking about the site.",
      "bulk-mail",
    );
  }

  // Counted, not merely detected. One discount phrase can turn up in a genuine
  // listing for a shopping tool; three in one message is an advert. A single
  // hit stays below the quarantine line, so the benefit of the doubt is the
  // default and it takes a pattern to lose it.
  const retailHits = new Set(
    (prose.match(RETAIL_RE) ?? []).map((m) => m.toLowerCase()),
  ).size;
  if (retailHits > 0) {
    add(
      "retail-boilerplate",
      retailHits >= 2 ? W.bulkFooter : W.retailBoilerplate,
      retailHits >= 2
        ? `Reads as a shop advert: ${retailHits} pieces of retail boilerplate (percentage off, free shipping, act now).`
        : "Uses retail advert boilerplate (a percentage off, free shipping, act now).",
      "outbound-promo",
    );
  }

  if (OFF_PLATFORM_RE.test(prose) && !PAYMENT_RAIL_RE.test(prose)) {
    add(
      "off-platform-contact",
      W.offPlatformContact,
      "Pushes the conversation onto WhatsApp / Telegram instead of replying by email.",
      "off-platform-contact",
    );
  }

  // Both direction rules stand down when the sender is plainly asking rather
  // than pitching. A buyer allowed to use a spammer's vocabulary is the whole
  // point of the exercise.
  if (!buyerVoice && OUTBOUND_OFFER_RE.test(prose)) {
    add(
      "outbound-offer",
      W.outboundOffer,
      'Offers us a service ("we can get you ...") rather than asking for one.',
      "outbound-promo",
    );
  }

  if (!buyerVoice && OUTREACH_RE.test(prose)) {
    add(
      "cold-outreach",
      W.outboundOffer,
      'Reads as cold outreach (guest posts, link exchange, "reply YES").',
      "outbound-promo",
    );
  }

  // Our own domain templated into the body is the signature of a mail-merge
  // aimed at every site in a scraped list.
  if (new RegExp(OWN_DOMAIN.replace(/\./g, "\\."), "i").test(prose)) {
    add(
      "own-domain-in-body",
      W.ownDomainInBody,
      "Has our own domain pasted into the message text, the shape of a mail-merge.",
      "outbound-promo",
    );
  }

  // Foreign links. The submitted tool URL is exempt entirely, and so is any host
  // that echoes the sender's email domain or the name they gave: prospects link
  // their own site constantly, and on the submit form that IS the submission.
  const own = new Set<string>();
  const submittedHost = hostOf(c.url ?? "");
  if (submittedHost) own.add(baseDomain(submittedHost));
  if (emailDomain) own.add(baseDomain(emailDomain));
  own.add(OWN_DOMAIN);

  const nameKey = alnum(c.name ?? "");
  const foreign = linkHostsIn(prose).filter((h) => {
    const b = baseDomain(h);
    if (own.has(b)) return false;
    // "PixMind" linking pixmind.io, or their own docs subdomain.
    const hostKey = alnum(b).replace(/(com|net|org|io|ai|co|app|dev)$/, "");
    if (nameKey.length >= 4 && alnum(b).includes(nameKey)) return false;
    if (hostKey.length >= 4 && nameKey.includes(hostKey)) return false;
    return true;
  });
  const uniqueForeign = [...new Set(foreign)];
  if (uniqueForeign.length > 0) {
    // The first one is 30, below the quarantine line on purpose. Two or more is
    // a link drop and crosses it.
    const weight = Math.min(uniqueForeign.length, 2) * W.foreignLink;
    add(
      "foreign-links",
      weight,
      uniqueForeign.length === 1
        ? `Links to someone else's site (${uniqueForeign[0]}).`
        : `Links to ${uniqueForeign.length} other sites (${uniqueForeign.slice(0, 3).join(", ")}).`,
      "link-spam",
    );
  }

  // Written prose only. The name field is excluded because brand names are
  // chosen to be unusual and routinely drop their vowels - the live corpus
  // caught this before it shipped, with "HtmlSlides" (htmlsl, six consonants)
  // an approved and published listing. A product name is not prose, and a rule
  // that reads it as prose is the vowel-ratio mistake wearing a better hat.
  if (hasConsonantRun([c.subject, c.message].filter(Boolean).join("\n"))) {
    add(
      "consonant-run",
      W.consonantRun,
      "Contains a run of six or more consonants with no vowel, which real words do not have.",
      "keyboard-mash",
    );
  }

  // ── Browser proof ─────────────────────────────────────────────────────────

  if (c.elapsedMs === undefined || c.elapsedMs === null) {
    // No stamp at all. Below the quarantine line by itself, deliberately: right
    // after a deploy a browser can be running a cached bundle that never learned
    // to send one, and bouncing that person is our bug, not their fault.
    add(
      "no-browser-proof",
      W.noBrowserProof,
      "Sent without the browser timing stamp, so it may be a direct POST or a stale cached page.",
      "no-browser-proof",
    );
  } else if (c.elapsedMs >= 0 && c.elapsedMs < MIN_FILL_MS) {
    add(
      "too-fast",
      W.tooFast,
      `Submitted ${Math.round(c.elapsedMs / 100) / 10}s after the form appeared, faster than it can be read and filled in.`,
      "bot-trap",
    );
  }

  // ── Context the caller looked up ──────────────────────────────────────────

  if (c.duplicateWithin24h) {
    add(
      "duplicate-payload",
      W.duplicate,
      "The same message text arrived in the last 24 hours under a different email address.",
      "duplicate",
    );
  }

  if ((c.subnetCount ?? 0) >= SUBNET_BURST) {
    add(
      "subnet-flood",
      W.subnetFlood,
      `Part of a burst of ${c.subnetCount} submissions from neighbouring addresses in the same network block.`,
      "flood",
    );
  }

  // ── Score ─────────────────────────────────────────────────────────────────

  const hard = signals.filter((s) => s.weight >= REJECT_AT);
  const soft = signals.filter((s) => s.weight < REJECT_AT);

  // Soft signals are capped one point below the reject line. Wording alone can
  // never destroy a submission; the most it can do is ask a human to look.
  const softScore = Math.min(
    soft.reduce((n, s) => n + s.weight, 0),
    SOFT_CAP,
  );
  const score = hard.length > 0 ? 100 : softScore;

  const verdict: Verdict =
    score >= REJECT_AT ? "reject" : score >= QUARANTINE_AT ? "quarantine" : "allow";

  const ordered = [...signals].sort((a, b) => b.weight - a.weight);

  return {
    verdict,
    score,
    category: ordered[0]?.category ?? "clean",
    reasons: ordered.map((s) => s.reason),
    signals: ordered,
  };
}
