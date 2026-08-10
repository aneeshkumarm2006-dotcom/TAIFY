import { TOOLS } from "./tools";

/**
 * Profession pages — "AI for doctors", "AI for lawyers", and so on.
 *
 * These are a second, cross-cutting taxonomy that sits alongside CATEGORIES.
 * A tool carries exactly one `category` (see Tool in lib/types.ts), so a
 * category page answers "what does this tool do". A role answers "I am a X,
 * what should I use", which almost always spans several categories: a lawyer
 * needs contract review (legal), a note-taker (productivity) and a proofreader
 * (writing). Reassigning tools to make professions work as categories would
 * have emptied /category/legal and friends, so roles pull tools by curated slug
 * instead and nothing moves.
 *
 * Picks are hand-chosen rather than tag-matched. A rule like "tag contains
 * contracts" cannot know that DoNotPay is for consumers and Harvey is for
 * firms, and a profession page that recommends the wrong one is worse than no
 * page. The cost is that new tools do not appear here until someone adds them —
 * `assertRolePicksExist` below at least stops a typo or a renamed tool from
 * silently dropping a pick.
 *
 * Slugs are `ai-for-<role>` at the site root because that is the phrase people
 * type. They are served by app/[slug]/page.tsx and reserved in
 * lib/pages/reserved.ts so an admin custom page can never shadow one.
 */

export interface RolePick {
  /** Tool slug, must exist in TOOLS. */
  slug: string;
  /** Why this tool for this profession specifically — not the generic tagline. */
  why: string;
}

export interface RoleSection {
  heading: string;
  body: string;
  picks: RolePick[];
}

export interface Role {
  /** Bare role slug, e.g. "doctors". The URL is `/ai-for-<slug>`. */
  slug: string;
  /** Plural profession name, e.g. "Doctors". */
  name: string;
  /** Short label for cards and breadcrumbs, e.g. "doctors". */
  lower: string;
  h1: string;
  metaTitle: string;
  excerpt: string;
  intro: string;
  sections: RoleSection[];
  /** The honest "what this cannot do for you" note. Rendered as a warn callout. */
  watchOut: { title: string; body: string };
  /** Buying-guide body copy, HTML. */
  guide: string;
  faq: { q: string; a: string }[];
}

/** Canonical path for a role page. */
export function rolePath(role: Role | string): string {
  return `/ai-for-${typeof role === "string" ? role : role.slug}`;
}

export const ROLES: Role[] = [
  // ---------------------------------------------------------------- doctors
  {
    slug: "doctors",
    name: "Doctors",
    lower: "doctors",
    h1: "AI for Doctors",
    metaTitle: "Best AI Tools for Doctors (2026) | TAIFY",
    excerpt:
      "AI tools doctors actually use: evidence lookup, dictation, patient letters and admin. Real monthly prices, and a straight answer on what is not safe for patient data.",
    intro:
      "Most of what a doctor loses time to is not diagnosis, it is paperwork. These are the tools that help with the paperwork, plus the evidence-lookup ones worth trusting. Read the warning below before any of it touches a patient record — the honest position is that this catalog has no cleared clinical documentation product in it yet.",
    sections: [
      {
        heading: "Evidence lookup and keeping current",
        body: "The job here is finding what the literature actually says without reading forty abstracts. These tools cite what they tell you, which is the only reason they belong in clinical work at all — an answer you cannot trace is an answer you cannot use.",
        picks: [
          { slug: "consensus", why: "Answers a clinical question straight from published papers and shows you how many support it, so you see the weight of evidence rather than one study." },
          { slug: "elicit", why: "Pulls the data out of a set of trials into a table — sample size, population, outcome — which is faster than reading them to compare." },
          { slug: "scispace", why: "Explains a dense paper paragraph by paragraph. Useful when you are reading outside your specialty." },
          { slug: "semantic-scholar", why: "Free, and its citation graph shows whether a paper held up or quietly stopped being cited." },
          { slug: "perplexity", why: "Fast orientation on guidelines and drug information with links. Treat it as a starting point, never the citation." },
          { slug: "notebooklm", why: "Upload the guidelines your trust actually follows and ask questions against those documents only, so answers come from your protocol rather than the internet." },
        ],
      },
      {
        heading: "Dictation, notes and letters",
        body: "General-purpose transcription and drafting, which is where the real hours go. None of these are built for consultations, and that distinction matters more here than anywhere else on this site — see the warning below.",
        picks: [
          { slug: "otter-ai", why: "Transcribes meetings and dictated notes cheaply, with a usable free tier for MDT meetings and teaching sessions." },
          { slug: "granola", why: "Takes your rough typed notes and fills them into a clean summary afterwards, so you are not writing full sentences during a conversation." },
          { slug: "speechify", why: "Reads documents aloud at speed — for getting through letters, discharge summaries and journal articles on a commute." },
          { slug: "grammarly", why: "Catches the errors in referral letters and reports that you stop seeing after the fourth draft." },
          { slug: "claude", why: "Best of the general assistants at turning bullet points into a readable clinic letter, and at rewriting one for a patient rather than a colleague." },
        ],
      },
      {
        heading: "Patient communication and teaching",
        body: "Explaining things twice, once for the notes and once for the person. This is where general AI earns its keep, because reading-level rewriting is genuinely what these models are best at.",
        picks: [
          { slug: "chatgpt", why: "Rewrites a diagnosis or a discharge plan at a reading level a worried patient can follow, in whatever language they need." },
          { slug: "gamma", why: "Turns teaching notes into slides for a departmental session in about a minute, which is roughly the amount of prep time you have." },
          { slug: "canva", why: "Patient leaflets and posters that do not look like they were made in Word in 2006. Free tier covers most of it." },
          { slug: "krisp", why: "Strips ward noise out of telehealth calls and dictation. Runs locally, which is the reason it is on this list rather than a cloud alternative." },
        ],
      },
      {
        heading: "Rota, inbox and the rest of the admin",
        body: "Not medical, just the overhead that comes with the job. Cheap wins, and none of it touches clinical data if you keep it that way.",
        picks: [
          { slug: "motion", why: "Rebuilds your task list around the time you actually have free, which suits a week that gets rearranged by other people." },
          { slug: "superhuman", why: "Triages a heavy inbox fast and drafts the short replies. Expensive, worth it only if email is genuinely your bottleneck." },
          { slug: "reclaim-ai", why: "Defends admin and study time in your calendar before meetings eat it." },
          { slug: "zapier", why: "Joins the systems that do not talk to each other, so routine forwarding and logging stops being a manual job." },
        ],
      },
    ],
    watchOut: {
      title: "Read this before any of it sees a patient record",
      body: "Nothing on this page is a cleared clinical documentation tool. The ambient scribes built for consultations — Abridge, Microsoft DAX Copilot, Heidi, Freed — are not in this catalog yet, and the general transcription and chat tools listed here are not a substitute for them. Consumer tiers of these products are not covered by a BAA or a DPA that would make identifiable patient data acceptable, and several train on input by default. Assume anything you paste is disclosed until your own governance team tells you otherwise in writing. Use these for literature, teaching, drafting and admin; keep identifiers out.",
    },
    guide:
      "<h2>How to pick AI tools as a doctor</h2><p>Split the problem in two before you look at any product. There is clinical work, where the bar is information governance and traceable evidence, and there is everything else — letters, teaching, rota, inbox — where the bar is just whether it saves you time. Almost all of the available value is in the second bucket, and almost all of the risk is in the first.</p><p>For evidence tools, the only question worth asking is whether it shows you the source. A model that summarises the literature without citing it has given you something you cannot put in a note or defend in a review. Consensus, Elicit and Semantic Scholar all cite by design; a general chatbot does not, and will invent a plausible reference if pushed.</p><p>For anything involving a patient, the deciding factor is contractual, not technical. A consumer subscription is not a data processing agreement. If your organisation has not approved the tool for identifiable data, the tool is for de-identified or non-clinical work only, however good it is.</p><p>Prices on this page are what one clinician pays per month at normal use, divided down where the product bills annually. Several of these have free tiers that are genuinely enough for literature and teaching work, which is the sensible place to start.</p>",
    faq: [
      {
        q: "Is there an AI that writes clinical notes from a consultation?",
        a: "Yes, but not in this catalog yet. That category is ambient clinical documentation — Abridge, Microsoft DAX Copilot, Heidi and Freed are the established names — and they exist specifically because general transcription tools are not appropriate for consultations. The transcription tools listed on this page are for meetings, teaching and dictation of non-identifiable content. We would rather say that plainly than point you at Otter for a patient encounter.",
      },
      {
        q: "Can I put patient information into ChatGPT or Claude?",
        a: "Not on a consumer plan, and not unless your organisation has signed something that covers it. Both companies offer business and enterprise terms that change how input is handled, but the personal subscription most people have is not that. The workable habit is de-identifying before you paste: describe the case without anything that could name the person.",
      },
      {
        q: "Which AI is best for looking up evidence?",
        a: "<a href=\"/tool/consensus\">Consensus</a> if you want a direct answer to a clinical question with the weight of supporting papers shown. <a href=\"/tool/elicit\">Elicit</a> if you are comparing trials and want their characteristics extracted into a table. <a href=\"/tool/notebooklm\">NotebookLM</a> if the authority you care about is your own trust guidelines rather than the wider literature — you upload them and it answers from those alone.",
      },
      {
        q: "Are any of these free?",
        a: "Semantic Scholar is free outright. Consensus, Elicit, Perplexity, Otter and NotebookLM all have free tiers you can do real work on, which is enough to test whether the tool fits your week before anything is expensed. Filter the full catalog by free tier on <a href=\"/browse\">Browse</a> to see everything that qualifies.",
      },
    ],
  },

  // ---------------------------------------------------------------- lawyers
  {
    slug: "lawyers",
    name: "Lawyers",
    lower: "lawyers",
    h1: "AI for Lawyers",
    metaTitle: "Best AI Tools for Lawyers (2026) | TAIFY",
    excerpt:
      "The AI tools lawyers actually use for contract review, drafting and legal research, compared on real monthly cost — plus the citation problem you have to check for.",
    intro:
      "Legal is one of the few professions where AI has produced tools worth their price rather than novelties. Contract review and first-draft work are genuinely faster now. Research is faster too, and it is also where practitioners have been sanctioned for filing citations that did not exist, so the citation warning below is not optional reading.",
    sections: [
      {
        heading: "Contract drafting and review",
        body: "The most mature legal AI there is. These read a contract against a standard, flag what deviates, and suggest the clause you would have typed. The good ones work where you already work rather than making you paste documents into a browser.",
        picks: [
          { slug: "spellbook", why: "Runs inside Microsoft Word, so review happens in the document rather than a separate tool. The reason it gets adopted where others get abandoned." },
          { slug: "robin-ai", why: "Built for volume — a stack of NDAs or supplier agreements reviewed against your playbook rather than one contract at a time." },
          { slug: "legora", why: "Strong on collaborative review where several people touch the same document, and it shows its sources for each suggestion." },
          { slug: "harvey", why: "The firm-scale option, trained for legal work and priced for practices rather than individuals. Expect a procurement conversation, not a signup." },
        ],
      },
      {
        heading: "Research and case analysis",
        body: "Faster than reading everything, and the place where the profession has been burned. Every tool here is a way of finding the authority; none of them is a substitute for opening it.",
        picks: [
          { slug: "cocounsel", why: "Legal-specific research and document review from Thomson Reuters, which means it is answering from a real legal corpus rather than the open web." },
          { slug: "notebooklm", why: "Upload the bundle — pleadings, disclosure, contracts — and question those documents only. Answers cite the page they came from, so you can check every one." },
          { slug: "claude", why: "Handles long documents better than most and does not bluff as readily when asked to summarise a 200-page agreement." },
          { slug: "perplexity", why: "Quick orientation on an unfamiliar area with links to follow. A map, not a source." },
        ],
      },
      {
        heading: "Client intake, meetings and matter admin",
        body: "The unbilled hours. Notes, follow-ups, scheduling and the small drafting jobs that pile up between the actual legal work.",
        picks: [
          { slug: "fireflies", why: "Records and summarises client calls with action points, so the file note writes itself while the detail is still accurate." },
          { slug: "granola", why: "Better than a full transcript when you want a usable attendance note rather than 6,000 words of verbatim." },
          { slug: "grammarly", why: "Catches the typo in the letter that goes out under your name. Dull, and the highest-value tool on this list per pound." },
          { slug: "motion", why: "Keeps a deadline-driven workload ordered when three matters move at once." },
        ],
      },
      {
        heading: "For consumers rather than firms",
        body: "One entry, listed separately on purpose. If you are a practitioner this is not your tool; if you are a member of the public who found this page looking for help with a parking ticket, it is the honest answer.",
        picks: [
          { slug: "donotpay", why: "Consumer-facing help with small claims, disputes and cancellations. Not built for practice, and it has drawn regulatory criticism over how it describes what it does." },
        ],
      },
    ],
    watchOut: {
      title: "Check every citation, every time",
      body: "Lawyers in several jurisdictions have been fined and referred for filing submissions containing case citations that a general AI model invented, complete with plausible names, courts and dates. This failure mode has not been solved, only reduced. A legal-specific tool answering from a real corpus is far safer than a general chatbot, but the rule stands regardless of tool: if you have not opened the authority and read it, do not cite it. The same applies to quotations from a document — verify against the page, not the summary.",
    },
    guide:
      "<h2>How to pick legal AI</h2><p>Start with where the work happens. The tools that survive contact with a real practice are the ones that live inside Word, your document management system or your inbox, because a review tool that requires copying a contract into a browser gets used twice and then quietly dropped. Spellbook's whole advantage is that it is a Word add-in.</p><p>Then decide whether you need a legal corpus or a good reader. Research tools like CoCounsel are answering from licensed legal material, which is what you want when the question is what the law says. General models like Claude are answering from training data plus whatever you gave them, which is what you want when the question is what this specific 200-page agreement says. Using the second for the first is how fabricated citations end up in filings.</p><p>Price ranges further here than in any other profession on this site. A solo practitioner can get most of the value from a Word add-in and a note-taker for well under $150 a month combined. Firm-scale platforms are an order of magnitude above that and are sold, not bought — the listed figures are indicative and every real number comes out of a procurement conversation.</p><p>Confidentiality decides the rest. Client material in a consumer AI subscription is a professional conduct problem before it is a technical one. Check whether input is used for training, whether the vendor will sign what your insurer expects, and whether your jurisdiction's regulator has said anything about disclosure to clients.</p>",
    faq: [
      {
        q: "What is the best AI tool for lawyers?",
        a: "It depends on the work. For contract drafting and review, <a href=\"/tool/spellbook\">Spellbook</a> is the usual answer for small and mid-size practices because it runs inside Word. For research from a real legal corpus, <a href=\"/tool/cocounsel\">CoCounsel</a>. For interrogating the documents in one matter, <a href=\"/tool/notebooklm\">NotebookLM</a> is hard to beat and costs nothing. Firms buying one platform for everything are usually looking at <a href=\"/tool/harvey\">Harvey</a> or <a href=\"/tool/legora\">Legora</a>.",
      },
      {
        q: "Can AI replace a paralegal or a junior solicitor?",
        a: "No, and the framing causes bad decisions. What these tools compress is first-pass work — the initial read of a contract, the first draft of a clause, the summary of a long document. All of it still needs someone qualified to check it, and the checking is the part that carries the liability. The realistic effect is that the same person handles more matters, not that the role disappears.",
      },
      {
        q: "Is it safe to put client documents into AI tools?",
        a: "Into a legal-specific tool on a business contract, generally yes, and that is what you are paying the premium for. Into a consumer chatbot subscription, no. The questions to ask are whether your input trains the model, where the data is held, and whether the vendor will sign the terms your professional indemnity insurer expects. Get that in writing before the first real matter goes in.",
      },
      {
        q: "Are there free AI tools for legal work?",
        a: "<a href=\"/tool/notebooklm\">NotebookLM</a> is free and genuinely useful for questioning a document bundle. Claude and Perplexity have free tiers adequate for summarising and orientation. The purpose-built contract and research platforms have no free tier — that part of the market is subscription-only, starting around $80 a month per seat.",
      },
    ],
  },

  // --------------------------------------------------------------- teachers
  {
    slug: "teachers",
    name: "Teachers",
    lower: "teachers",
    h1: "AI for Teachers",
    metaTitle: "Best AI Tools for Teachers (2026) | TAIFY",
    excerpt:
      "AI tools for lesson planning, resources, marking and admin, with real prices and free tiers — plus why AI detectors do not work and what to do instead.",
    intro:
      "The honest version of AI for teaching: it is very good at producing the materials around a lesson and mediocre at anything requiring judgement about a particular child. Planning, differentiation, worksheets, slides and the endless admin are where the time comes back. Marking is where people expect the most and get the least.",
    sections: [
      {
        heading: "Planning and resources",
        body: "First drafts of the things that eat a Sunday. Nothing here produces a lesson you would teach unedited, but it removes the blank page, which is most of the work.",
        picks: [
          { slug: "chatgpt", why: "The workhorse. Differentiated versions of the same worksheet at three reading levels, in the time it takes to ask." },
          { slug: "claude", why: "Better than most at long, structured documents — a scheme of work or a unit plan rather than a single activity." },
          { slug: "gamma", why: "Lesson slides from a text outline in about a minute, and they look designed rather than defaulted." },
          { slug: "canva", why: "Worksheets, displays and knowledge organisers that look right. Free for educators, which makes it close to essential." },
          { slug: "notion-ai", why: "Somewhere to keep schemes of work that you can then question in plain English instead of hunting through folders." },
        ],
      },
      {
        heading: "Explaining, tutoring and practice",
        body: "Tools that work through a problem rather than answering it. Several of these are student-facing, which matters — knowing what your class is already using is half the reason to look at them.",
        picks: [
          { slug: "khanmigo", why: "Built to guide rather than answer, which is the only tutoring behaviour that is any use in a classroom. Cheap, and designed for schools." },
          { slug: "wolfram-alpha", why: "Computes and shows working reliably, which general chatbots still do not for anything beyond routine arithmetic." },
          { slug: "symbolab", why: "Step-by-step algebra and calculus solutions — good for building worked examples quickly." },
          { slug: "quizlet", why: "Retrieval practice sets from your own material, with the class already knowing how to use it." },
          { slug: "socratic", why: "What your students are using on their phones. Worth understanding for that reason alone." },
          { slug: "speak", why: "Speaking practice for language classes, which is the part of MFL that class size makes impossible." },
        ],
      },
      {
        heading: "Feedback, marking and writing",
        body: "Where expectations need managing. AI is useful for the mechanics of feedback and for your own writing; it cannot mark to a rubric with the reliability you would need to stand behind a grade.",
        picks: [
          { slug: "grammarly", why: "Fast, consistent surface-level correction — and useful modelled feedback for students on mechanics." },
          { slug: "quillbot", why: "Rewrites a text at a different reading level, which is the quickest route to a differentiated version of a source." },
          { slug: "otter-ai", why: "Transcribes parents' evenings and meetings so you have a record without writing during the conversation." },
          { slug: "photomath", why: "Listed so you know it exists: point a phone at a maths question and get the answer with steps. Plan homework accordingly." },
        ],
      },
      {
        heading: "Admin and the rest of the workload",
        body: "Reports, emails, letters, rotas. Not teaching, and a large fraction of the hours.",
        picks: [
          { slug: "zapier", why: "Automates the repetitive forwarding and logging between school systems that nobody is paid to do." },
          { slug: "motion", why: "Fits marking and prep into the gaps a timetable leaves, and re-plans when a cover lesson lands." },
          { slug: "gemini", why: "Free tier is generous and it sits inside Google Workspace, which is what most schools already run on." },
          { slug: "microsoft-copilot", why: "The equivalent if your school is a Microsoft school. Included in some education tenancies already — check before buying anything." },
        ],
      },
    ],
    watchOut: {
      title: "AI detectors do not work, and two other things",
      body: "AI text detectors produce false positives at a rate that makes them unsafe as evidence, and they misfire more often on students writing in a second language. Accusing a child on a detector score is indefensible; if you suspect AI use, look at drafting history and talk to the student. Second, student data: names, assessment records and anything about a child's needs should not go into a consumer AI subscription — your school's DPA governs this and consumer tiers are not covered. Third, everything these tools produce contains errors at a low but real rate, including in maths and in factual content. Read it before it reaches thirty children.",
    },
    guide:
      "<h2>How to pick AI tools as a teacher</h2><p>Check what your school already pays for first. If you are a Google school, Gemini is in the Workspace you already have; if you are a Microsoft school, Copilot may already be in your tenancy. A surprising number of teachers pay personally for a tool their trust has already licensed, and the licensed version is usually the one that is actually approved for use with school data.</p><p>Then aim at preparation rather than assessment. The reliable wins are differentiation, resource production, slides and admin — jobs where you are the editor and the output is a draft. Marking is the opposite: the model cannot see the child, does not hold your rubric consistently across thirty scripts, and produces feedback that reads plausible and lands generic. Use it for the phrasing of feedback you have already decided on, not for deciding it.</p><p>Assume everything needs reading. Generated worksheets contain wrong answers, invented quotations and the occasional confidently incorrect date. The time saved is real, but it is the time you spent writing, not the time you spend checking.</p><p>Prices on this page are per month for one person at normal use. Canva is free for educators, Gemini and ChatGPT have free tiers that cover most planning work, and Khanmigo is a few pounds — the sensible starting spend on this page is zero.</p>",
    faq: [
      {
        q: "What is the best AI tool for teachers?",
        a: "For planning and differentiation, <a href=\"/tool/chatgpt\">ChatGPT</a> or <a href=\"/tool/claude\">Claude</a> — Claude for longer structured documents, ChatGPT for quick variations on a task. For anything you hand to a class, <a href=\"/tool/canva\">Canva</a>, which is free for educators. For slides, <a href=\"/tool/gamma\">Gamma</a>. If your school is already on Google or Microsoft, start with the assistant you have rather than buying a third one.",
      },
      {
        q: "Can AI mark student work?",
        a: "Not to a standard you should put a grade behind. It marks surface features consistently and everything else inconsistently — the same script can come back with different judgements, and it cannot hold a rubric across a set the way a human moderator does. Where it genuinely helps is drafting the feedback comment once you have decided the judgement, and spotting mechanical errors before you read for content.",
      },
      {
        q: "How do I tell if a student used AI?",
        a: "Not with a detector. False positive rates are high enough that a detector score is not evidence, and they flag second-language writers disproportionately. What works is process: drafting history in Docs or Word, an in-class writing sample to compare against, and asking the student to talk through their argument. Designing assessment so the process is visible beats trying to catch the output.",
      },
      {
        q: "Are there free AI tools for teaching?",
        a: "Most of the useful ones. Canva is free for educators, Gemini and ChatGPT have free tiers adequate for planning, Socratic is free and Quizlet's free tier covers class sets, and Khanmigo costs a few pounds a month. Filter by free tier on <a href=\"/browse\">Browse</a> to see the full list before spending anything.",
      },
    ],
  },

  // ------------------------------------------------------------ accountants
  {
    slug: "accountants",
    name: "Accountants",
    lower: "accountants",
    h1: "AI for Accountants",
    metaTitle: "Best AI Tools for Accountants (2026) | TAIFY",
    excerpt:
      "AI for bookkeeping, reconciliation, accounts payable and reporting, compared on real monthly cost. What automates cleanly and what still needs a human sign-off.",
    intro:
      "Accounting has the clearest AI wins of any profession here, because the work is high-volume, rule-shaped and already digital. Categorisation, reconciliation and invoice capture genuinely automate. Advisory, judgement and anything a regulator might ask about do not, and the practices that get this wrong are the ones that stopped reviewing the automation.",
    sections: [
      {
        heading: "Bookkeeping and reconciliation",
        body: "The core of it. These learn how you categorise, do the first pass, and hand back the exceptions — which turns a day of coding transactions into an hour of reviewing decisions.",
        picks: [
          { slug: "booke", why: "Built for practices rather than businesses: automates categorisation and reconciliation across client books and syncs with QuickBooks and Xero." },
          { slug: "digits", why: "Continuous categorisation with a genuinely readable view of where a client's money went, which makes the monthly conversation easier." },
          { slug: "puzzle", why: "Accounting built around automation from the start rather than bolted on, which shows in how little cleanup it needs." },
          { slug: "vic-ai", why: "Invoice processing and coding at volume, aimed at AP teams handling thousands of documents a month." },
        ],
      },
      {
        heading: "Accounts payable, spend and expenses",
        body: "Where the receipts and approvals live. Less about intelligence than about never chasing a paper receipt again.",
        picks: [
          { slug: "ramp", why: "Cards, expenses and AP in one place with automated coding and policy checks — removes most of the month-end receipt chase." },
          { slug: "zapier", why: "Connects the systems that will never integrate natively, which in practice means the client's tool and yours." },
        ],
      },
      {
        heading: "Analysis and reporting",
        body: "Turning a ledger into something a client understands. This is the part that has moved from spreadsheet gymnastics to asking a question in English.",
        picks: [
          { slug: "julius", why: "Upload a trial balance or transaction export and ask questions in plain English. It writes and runs the analysis and shows the chart." },
          { slug: "numerous-ai", why: "AI functions inside Google Sheets and Excel, so cleanup and categorisation happen where your working papers already are." },
          { slug: "rows", why: "A spreadsheet with AI and live data connections built in — good for recurring client reporting packs." },
          { slug: "power-bi", why: "The reporting layer most mid-size clients already own. Its AI features answer questions against the model without you building a new visual." },
        ],
      },
      {
        heading: "Client work, meetings and writing",
        body: "The advisory half of the job, where the tool is a drafting assistant rather than an automation.",
        picks: [
          { slug: "claude", why: "Explains a set of figures in language a non-financial director will follow, which is most of what a management letter is." },
          { slug: "granola", why: "Client meeting notes that turn into actions without you typing through the conversation." },
          { slug: "fireflies", why: "Records and summarises client calls — useful when the fee dispute six months later turns on what was agreed." },
          { slug: "grammarly", why: "Keeps letters and reports going out clean under the practice's name." },
        ],
      },
    ],
    watchOut: {
      title: "Automated coding is a draft, not a filing",
      body: "Categorisation engines are right most of the time and wrong in ways that compound quietly: a misposted recurring transaction repeats every month until someone notices. Review the exceptions and sample the confident ones. Two further points. Client data in a consumer AI subscription is a confidentiality problem and, depending on your jurisdiction, a regulatory one — use business tiers with a signed DPA. And you remain responsible for the numbers; no professional body accepts a tool's categorisation as a reason a return was wrong.",
    },
    guide:
      "<h2>How to pick accounting AI</h2><p>Work out whether you are buying automation or analysis, because they are different markets. Automation tools — Booke, Digits, Vic.ai — plug into the ledger and reduce keystrokes on high-volume work; you judge them on how few exceptions they hand back and how well they sync with QuickBooks or Xero. Analysis tools — Julius, Numerous, Rows — sit on top of data you export and are judged on whether they answer questions faster than you would in Excel.</p><p>Integration decides everything for the first group. A categorisation engine that does not write back cleanly to the ledger creates reconciliation work rather than removing it, so check the sync in both directions on a real client before rolling it out across the book.</p><p>For the analysis group, the pattern that actually saves time is asking for the working rather than the answer. Julius writing the Python it used, or Numerous showing the formula, gives you something you can check and reuse. An answer with no visible method is a number you cannot put in front of a client.</p><p>Prices are per month at normal single-user use, divided down where billing is annual. Practice tools start around $20 a seat; AP platforms aimed at volume are priced per document or per user and climb quickly. Test on one client's book before committing the practice.</p>",
    faq: [
      {
        q: "Will AI replace accountants?",
        a: "It is replacing bookkeeping keystrokes, not accountants. Categorisation, reconciliation and invoice capture are genuinely automating, and those were billable hours for many practices. What does not automate is judgement, advisory work, and being the person who signs. The practices doing well out of this moved the freed hours into advisory rather than trying to keep the compliance fee.",
      },
      {
        q: "What is the best AI tool for bookkeeping?",
        a: "<a href=\"/tool/booke\">Booke AI</a> if you are a practice working across client books, because it is built for that and syncs with QuickBooks and Xero. <a href=\"/tool/digits\">Digits</a> if the priority is a clear view a client can read. <a href=\"/tool/vic-ai\">Vic.ai</a> if the volume is in supplier invoices rather than bank transactions.",
      },
      {
        q: "Can I use ChatGPT for accounting work?",
        a: "For drafting and explanation, yes — management letters, explaining a variance to a non-financial reader, writing up a procedure. For arithmetic on real figures, no. General models still make calculation errors and will not tell you when they have. Use a tool that runs actual code on the data, like <a href=\"/tool/julius\">Julius</a>, when numbers matter, and keep client identifiers out of consumer subscriptions.",
      },
      {
        q: "How much does accounting AI cost?",
        a: "Bookkeeping automation is roughly $20 to $50 a month per user, and AP platforms priced by document volume run well above that. Analysis tools sit around $10 to $25. The free tiers of Julius and the general assistants are enough to test the workflow on an anonymised export before anything is expensed.",
      },
    ],
  },

  // ------------------------------------------------------------- consultants
  {
    slug: "consultants",
    name: "Consultants",
    lower: "consultants",
    h1: "AI for Consultants",
    metaTitle: "Best AI Tools for Consultants (2026) | TAIFY",
    excerpt:
      "AI for research, analysis, decks and client delivery, priced honestly. The tools that shorten a deliverable without putting client data somewhere it should not be.",
    intro:
      "Consulting work is research, analysis, a deck and a meeting, repeated. All four have decent AI now, and the deck one is the most immediately obvious. The constraint that shapes every choice on this page is client confidentiality — most of these tools are fine on your own material and a contract breach on someone else's.",
    sections: [
      {
        heading: "Decks and deliverables",
        body: "Where the output actually lands. The realistic gain is getting to a complete draft deck in an hour rather than a day, then spending your time on the argument instead of alignment guides.",
        picks: [
          { slug: "gamma", why: "Outline in, presentable deck out, and it restructures cleanly when the story changes at 11pm." },
          { slug: "beautiful-ai", why: "Keeps slides balanced and on-brand automatically as content grows, which matters when a deck has forty of them." },
          { slug: "canva", why: "Broadest option for anything that is not a slide — one-pagers, diagrams, printed material." },
          { slug: "figma", why: "Where the deck goes when it needs to look bespoke rather than templated, with AI now handling the repetitive layout work." },
        ],
      },
      {
        heading: "Research and diligence",
        body: "Getting to a defensible view of a market or a company fast. The rule is the same as in law: these find the source, they are not the source.",
        picks: [
          { slug: "perplexity", why: "Fastest route to a cited overview of an unfamiliar market, with links you can follow into the real documents." },
          { slug: "claude", why: "Reads long filings, transcripts and reports without losing the thread, and summarises without inventing much." },
          { slug: "notebooklm", why: "Point it at the data room or the document set and question those documents only. Answers cite the page, so diligence stays checkable." },
          { slug: "consensus", why: "When a claim in the deck needs actual evidence behind it rather than a competitor's blog post." },
        ],
      },
      {
        heading: "Data and modelling",
        body: "Analysis without waiting for an analyst. These write and run the code, which means you can check the method rather than trusting a number.",
        picks: [
          { slug: "julius", why: "Upload a messy client export and ask questions in English. It writes the analysis, runs it, and shows the chart and the code." },
          { slug: "rows", why: "Spreadsheet with AI and live data connections — good for the recurring model that feeds a monthly client report." },
          { slug: "powerdrill", why: "Quick exploratory analysis across several files at once when you are still working out what the data says." },
          { slug: "hex", why: "The step up when the analysis needs to be reproducible and shared with a technical client team." },
        ],
      },
      {
        heading: "Meetings, notes and the engagement itself",
        body: "Interviews, workshops, steering committees. Capture is the difference between a synthesis on Friday and trying to remember Tuesday.",
        picks: [
          { slug: "granola", why: "Best fit for stakeholder interviews: your rough notes come back as a structured summary without a recording bot in the room." },
          { slug: "fireflies", why: "Full transcription and summaries with action points when you do want the record." },
          { slug: "otter-ai", why: "Cheapest reliable transcription, with a free tier that covers occasional use." },
          { slug: "motion", why: "Keeps two or three concurrent engagements ordered when every one of them thinks it is the priority." },
        ],
      },
    ],
    watchOut: {
      title: "Client material is the whole risk",
      body: "Most consulting engagements are governed by an NDA that says nothing about uploading the client's data to a third-party service, which means the safe reading is that you cannot. Consumer AI tiers may train on input and rarely come with a data processing agreement. Before client data goes anywhere: check the engagement terms, use business tiers, and prefer tools that answer from documents you have uploaded to a controlled workspace over ones that send content to a general model. Also watch the recording bot — joining a client workshop with a transcription tool without asking is a consent problem in several jurisdictions and a trust problem everywhere.",
    },
    guide:
      "<h2>How to pick AI tools as a consultant</h2><p>Buy for the bottleneck, not the deliverable. Most consultants assume the deck is the slow part; usually it is synthesis — turning fifteen interviews and four spreadsheets into a view. That argues for spending on capture and analysis, where a note-taker and a tool like Julius compress days, rather than on a fourth presentation product.</p><p>Prefer tools that show their work. A deck generator that produces slides you cannot restructure, or an analysis tool that gives a number with no visible method, creates rework at exactly the moment you cannot afford it. Gamma restructures. Julius shows the code. That is the difference between a draft and a dead end.</p><p>Then treat confidentiality as a selection criterion rather than a policy question. The workable pattern for most independents is a business tier of one general assistant, a document-scoped tool like NotebookLM for client material, and a firm rule that nothing identifiable goes into a consumer subscription. It costs slightly more and removes the category of problem entirely.</p><p>Prices on this page are per month at single-user rates, divided down from annual where relevant. A functional independent stack — one assistant, one deck tool, one note-taker, one analysis tool — lands around $60 to $100 a month.</p>",
    faq: [
      {
        q: "What is the best AI tool for making consulting decks?",
        a: "<a href=\"/tool/gamma\">Gamma</a> for speed from an outline to something presentable, and it handles late restructuring better than most. <a href=\"/tool/beautiful-ai\">Beautiful.ai</a> if brand consistency across a long deck matters more than flexibility. <a href=\"/tool/figma\">Figma</a> when the deliverable needs to look genuinely bespoke. None of them will produce the argument — they produce the artefact once you have it.",
      },
      {
        q: "Can I use AI on client data?",
        a: "Only within what the engagement terms allow, and almost never on a consumer subscription. Business and enterprise tiers change how input is handled and come with terms you can point a client at. The safer default is document-scoped tools where you control what is uploaded, like <a href=\"/tool/notebooklm\">NotebookLM</a>, and de-identifying before anything reaches a general model.",
      },
      {
        q: "Which AI is best for market research?",
        a: "<a href=\"/tool/perplexity\">Perplexity</a> for a fast cited overview of an unfamiliar market, <a href=\"/tool/claude\">Claude</a> for reading long filings and transcripts closely, and <a href=\"/tool/consensus\">Consensus</a> when a claim needs published evidence rather than a vendor blog. Use all three as ways of finding sources you then read, not as the source.",
      },
      {
        q: "Is it worth paying for these as an independent consultant?",
        a: "The note-taker and one good assistant pay for themselves in a single engagement — synthesis time is the expensive hour. The deck tool is worth it if you produce decks weekly and not if you produce them monthly. Start with free tiers of Gamma, Julius and Otter on a real project and only pay for whatever you stopped being able to work without.",
      },
    ],
  },

  // -------------------------------------------------------- project managers
  {
    slug: "project-managers",
    name: "Project managers",
    lower: "project managers",
    h1: "AI for Project Managers",
    metaTitle: "Best AI Tools for Project Managers (2026) | TAIFY",
    excerpt:
      "AI for planning, status reporting, meeting notes and automation, with real monthly prices. What removes admin from the role and what quietly makes reporting worse.",
    intro:
      "Project management is mostly information movement: who is doing what, what changed, who needs telling. AI is genuinely good at the movement and bad at the judgement. Notes, status drafts, scheduling and the automation between systems are real wins; anything that generates a status summary you have not verified is a way of reporting confidently on a project you have stopped understanding.",
    sections: [
      {
        heading: "Planning and tracking",
        body: "Where the plan lives. The useful AI here is not planning for you — it is keeping the plan current when reality moves, which is the part that decays fastest.",
        picks: [
          { slug: "clickup-brain", why: "Answers questions across tasks, docs and comments in the workspace, so a status question does not need three people to answer." },
          { slug: "motion", why: "Continuously rebuilds the schedule around what is actually free, which suits work that gets reprioritised weekly." },
          { slug: "notion-ai", why: "Project docs, decisions and specs you can question in plain English instead of searching for the page." },
          { slug: "reclaim-ai", why: "Protects focus and buffer time in calendars across a team before meetings absorb all of it." },
        ],
      },
      {
        heading: "Meetings, notes and follow-up",
        body: "The highest-value category on this page. Stand-ups, steering groups and retros produce actions that get lost between the call ending and someone writing them down.",
        picks: [
          { slug: "granola", why: "Your rough notes become a clean summary with actions, without a bot joining the call — the least intrusive option here." },
          { slug: "fireflies", why: "Full transcript, summary and action items, searchable later when a decision is disputed." },
          { slug: "otter-ai", why: "Cheap, reliable transcription with a workable free tier for occasional meetings." },
          { slug: "superhuman", why: "Clears the follow-up inbox faster, which is where actions go to die." },
        ],
      },
      {
        heading: "Reporting and stakeholder communication",
        body: "Translating a board of tasks into something a sponsor reads. Drafting is safe; letting the tool decide the RAG status is not.",
        picks: [
          { slug: "claude", why: "Turns a messy update into a clear paragraph pitched at the person reading it, without inflating the good news." },
          { slug: "gamma", why: "Steering-committee deck from an outline in minutes, which is roughly the prep time these get." },
          { slug: "rows", why: "Live-connected spreadsheet for the recurring metrics view that feeds a weekly report." },
          { slug: "grammarly", why: "Keeps the update readable and consistent when four people contribute to it." },
        ],
      },
      {
        heading: "Automation and glue",
        body: "Removing the manual copying between the tools your organisation refuses to consolidate.",
        picks: [
          { slug: "zapier", why: "The default for joining a tracker to a chat tool to a spreadsheet. Most PM admin is a Zap someone has not written yet." },
          { slug: "raycast", why: "Keyboard-driven launcher with AI built in — small per-use saving, large over a day of context switching." },
          { slug: "power-bi", why: "When reporting has to come out of the organisation's real data rather than your tracker." },
        ],
      },
    ],
    watchOut: {
      title: "Generated status reports drift from reality",
      body: "A tool summarising your task board produces a report about the board, not about the project. Boards are always somewhat stale, so the summary is confidently wrong in the same direction — and it reads well enough that nobody questions it. Two habits fix most of this: verify the RAG judgement yourself rather than accepting a generated one, and check the summary against what people said in the last stand-up, not just what the tickets say. Separately, get consent before a transcription bot joins a call, and keep commercially sensitive project detail out of consumer AI tiers.",
    },
    guide:
      "<h2>How to pick AI tools as a project manager</h2><p>Start with capture, because it is the one place the saving is unambiguous. Every project loses actions between a meeting ending and someone writing them up, and a note-taker closes that gap for around $10 to $20 a month. If you buy one thing off this page, buy that.</p><p>Then look at what your organisation already runs. The assistant built into your tracker — ClickUp Brain, or the equivalent in Jira or Asana — has the advantage of seeing the actual work items, which no external tool does. It is usually a cheaper add-on than a separate subscription and its answers are grounded in your data rather than a generic model.</p><p>Be deliberate about automation. Zapier removes real drudgery, but an undocumented automation that nobody else understands becomes a single point of failure the day you go on leave. Write down what each one does somewhere your successor will find it.</p><p>Resist buying a planning tool that promises to plan. Scheduling assistants like Motion are good at fitting known work into available time; they cannot judge dependency risk, and the estimates you feed them are the weak link either way. Prices on this page are per month at single-user rates — a working stack of a note-taker, a tracker assistant and one automation tool sits around $50 to $70.</p>",
    faq: [
      {
        q: "What is the best AI tool for project managers?",
        a: "A note-taker first — <a href=\"/tool/granola\">Granola</a> if you would rather not put a bot in the call, <a href=\"/tool/fireflies\">Fireflies.ai</a> if you want a searchable record. After that, whatever assistant is built into the tracker you already use, because it can see the actual work items. <a href=\"/tool/clickup-brain\">ClickUp Brain</a> is the example here; the equivalent exists in most trackers.",
      },
      {
        q: "Can AI write my status reports?",
        a: "It can write the draft, and it should not decide the judgement. Given your notes and board it will produce a readable update in seconds. What it cannot do is know that the green item is green because someone has not reported a problem yet. Write the RAG status yourself, let the tool handle the prose.",
      },
      {
        q: "Will AI replace project managers?",
        a: "It is removing the administrative half of the role — note-taking, chasing updates, formatting reports — and that was a large share of the job for some PMs. What it does not touch is the part that involves persuading people, absorbing bad news early and making a call with incomplete information. The role is shifting toward that, not disappearing.",
      },
      {
        q: "Are there free AI tools for project management?",
        a: "Otter has a usable free transcription tier, Notion AI and ClickUp Brain come as paid add-ons to plans many teams already have, and Zapier's free tier covers a few simple automations. Start there and see which one you stop being able to work without before paying.",
      },
    ],
  },

  // ------------------------------------------------------------ journalists
  {
    slug: "journalists",
    name: "Journalists",
    lower: "journalists",
    h1: "AI for Journalists",
    metaTitle: "Best AI Tools for Journalists (2026) | TAIFY",
    excerpt:
      "AI for transcription, research, verification and production, priced honestly — and a clear line on what must never be generated in published work.",
    intro:
      "Transcription is the one that changed the job: interviews that took an afternoon to type now take minutes. Research and production tools help too. Generation is where the profession has an actual ethics problem, and this page draws that line explicitly rather than pretending the tools are neutral.",
    sections: [
      {
        heading: "Interviews and transcription",
        body: "The clearest time saving available to any reporter. Accuracy is good enough that you correct rather than type, though never good enough to quote from without checking the audio.",
        picks: [
          { slug: "otter-ai", why: "Cheap, fast, and the free tier covers occasional interviews. The default for most reporters." },
          { slug: "descript", why: "Edit the audio by editing the transcript. Built for producing as well as transcribing, which suits anyone filing audio or video." },
          { slug: "assemblyai", why: "The API option when you are transcribing at volume or building it into a newsroom workflow. Strong on speaker labelling." },
          { slug: "fireflies", why: "Automatic recording and summaries for the calls that were meetings rather than interviews." },
        ],
      },
      {
        heading: "Research and verification",
        body: "Finding the document, then reading the document. Everything here is a route to a primary source, and the second half of that sentence is the part that keeps you employed.",
        picks: [
          { slug: "perplexity", why: "Fast cited orientation on an unfamiliar story, with links to follow. Where you start, never what you cite." },
          { slug: "notebooklm", why: "Drop in a 900-page report, a FOI release or a set of filings and question those documents only, with answers pointing at the page." },
          { slug: "claude", why: "Reads very long documents closely — the transcript, the accounts, the leaked bundle — and summarises without much invention." },
          { slug: "semantic-scholar", why: "Free, and the fastest way to check whether the study a press release is touting is real and how it was received." },
          { slug: "consensus", why: "When a scientific claim needs the weight of published evidence rather than one paper a source sent you." },
        ],
      },
      {
        heading: "Writing and editing",
        body: "Assistive only. These are for the mechanics — tightening, headline options, spotting the repeated word — not for producing copy that goes out under your byline.",
        picks: [
          { slug: "grammarly", why: "Catches what you stop seeing on the fourth read, at speed, on deadline." },
          { slug: "quillbot", why: "Useful for tightening an overlong passage or rephrasing your own sentence when it will not sit right." },
          { slug: "chatgpt", why: "Headline and standfirst options, structural suggestions, and a fast second opinion on whether a paragraph is clear." },
        ],
      },
      {
        heading: "Audio, video and repurposing",
        body: "Getting one story onto several platforms without a production team.",
        picks: [
          { slug: "adobe-podcast", why: "Rescues a badly recorded interview. The speech enhancement is genuinely close to a studio re-record." },
          { slug: "krisp", why: "Removes background noise live, which matters for a phone interview from a train." },
          { slug: "opusclip", why: "Pulls short vertical clips out of a long interview and captions them, which is otherwise an hour of editing per clip." },
          { slug: "canva", why: "Social cards, graphics and simple charts for a story, without waiting on a designer." },
          { slug: "elevenlabs", why: "Audio versions of written pieces. Read the disclosure point below before using a synthetic voice anywhere near a real person's." },
        ],
      },
    ],
    watchOut: {
      title: "The lines that end careers",
      body: "Never publish a quotation you have not checked against the recording — transcription errors are small, plausible and legally expensive. Never let a model generate a fact, a name, a date or a citation that reaches print unverified; the failure mode is confident invention, not obvious error. Never use a synthetic voice or generated image of a real person without labelling it, and check your outlet's policy before you do it at all. Source protection is the other half: a confidential recording uploaded to a consumer transcription service has left your control, and a consumer tier may train on it. If a source's safety depends on it, transcribe locally.",
    },
    guide:
      "<h2>How to pick AI tools as a journalist</h2><p>Buy transcription first and treat everything else as optional. It is the only tool on this page that removes hours rather than minutes, and for most reporters $10 to $20 a month is the entire justified spend. Whether you want Otter or Descript comes down to whether you also produce audio — Descript's transcript-based editing is worth the higher price only if you are cutting tape.</p><p>For research, the distinction that matters is whether the tool answers from your documents or from the internet. NotebookLM answering from a report you uploaded is checkable: it points at a page you can open. A general model answering about the report from training data is not, and that is where invented detail enters a story. On any document-led investigation, upload the documents.</p><p>Take the source-protection question seriously before it is urgent. Cloud transcription is fine for a council meeting and wrong for a whistleblower. Decide the rule now — which material never leaves your machine — rather than in the moment when you have an interview to file.</p><p>Prices on this page are per month at single-user rates. Several of the most useful tools here cost nothing: NotebookLM, Semantic Scholar, and the free tiers of Otter, Perplexity and Claude cover a lot of real reporting.</p>",
    faq: [
      {
        q: "What is the best AI transcription tool for interviews?",
        a: "<a href=\"/tool/otter-ai\">Otter.ai</a> for most reporters — cheap, accurate enough, usable free tier. <a href=\"/tool/descript\">Descript</a> if you also edit audio or video, because editing the transcript edits the tape. <a href=\"/tool/assemblyai\">AssemblyAI</a> if you are transcribing at volume through an API. Check quotes against the audio whichever you use.",
      },
      {
        q: "Can I use AI to write articles?",
        a: "For assistive work, yes: headline options, tightening, structure, a second read. For generating copy that publishes under your name, that is a policy question your outlet has probably already answered, and the answer is usually no or heavily disclosed. The practical risk is not style, it is that models invent specifics — names, figures, quotations — with total confidence.",
      },
      {
        q: "How do I use AI on a leaked document set safely?",
        a: "Use a tool scoped to the documents themselves rather than a general chatbot. <a href=\"/tool/notebooklm\">NotebookLM</a> answers only from what you upload and cites the page, which makes every claim checkable. For genuinely sensitive material where source safety is the concern, keep it off cloud services entirely and transcribe locally — no vendor promise substitutes for the file never leaving your machine.",
      },
      {
        q: "Are there free AI tools for journalism?",
        a: "The useful core is nearly free. NotebookLM and Semantic Scholar cost nothing, and Otter, Perplexity, Claude, Canva and Adobe Podcast all have workable free tiers. Filter by free tier on <a href=\"/browse\">Browse</a> for the rest.",
      },
    ],
  },

  // ----------------------------------------------------- financial advisors
  {
    slug: "financial-advisors",
    name: "Financial advisors",
    lower: "financial advisors",
    h1: "AI for Financial Advisors",
    metaTitle: "Best AI Tools for Financial Advisors (2026) | TAIFY",
    excerpt:
      "AI for research, client meetings, reporting and review notes, with real prices — plus the compliance and recordkeeping constraints that decide what you can actually use.",
    intro:
      "For advisors the binding constraint is not capability, it is compliance. Meeting notes, research and client reporting all have good tools; whether you can use them depends on recordkeeping rules, supervision requirements and what your firm's terms allow. This page is organised around that, and the tools that generate anything resembling advice are flagged rather than recommended.",
    sections: [
      {
        heading: "Research and market analysis",
        body: "Getting to a view faster. Everything here is input to your judgement, and the recommendation itself stays yours for reasons that are regulatory as well as sensible.",
        picks: [
          { slug: "rogo", why: "Built for financial research specifically — answers questions and builds analyses off financial data rather than the open web." },
          { slug: "perplexity", why: "Fast cited overview of a sector, a company or a policy change, with links into the primary documents." },
          { slug: "claude", why: "Reads long filings, fund documents and reports closely without losing the thread or inventing much." },
          { slug: "julius", why: "Ask questions of a portfolio or performance export in English; it writes and runs the analysis and shows the working." },
        ],
      },
      {
        heading: "Client meetings and notes",
        body: "The most defensible win on this page. A good contemporaneous note is both a service improvement and a supervision requirement, and this is the one job AI does reliably.",
        picks: [
          { slug: "granola", why: "Turns your rough notes into a structured record after the meeting, with no bot in the room to explain to a client." },
          { slug: "fireflies", why: "Full transcript and summary with actions — valuable precisely when what was discussed is later questioned." },
          { slug: "otter-ai", why: "Cheapest reliable transcription. Check retention settings before it holds recordings of client conversations." },
          { slug: "superhuman", why: "Keeps client correspondence from backing up, which is where service complaints start." },
        ],
      },
      {
        heading: "Reporting and client material",
        body: "Making numbers legible to the person whose money they are. Drafting and formatting, with you responsible for every figure and every claim.",
        picks: [
          { slug: "gamma", why: "Review-meeting decks from an outline in minutes rather than an afternoon of slide alignment." },
          { slug: "rows", why: "Live-connected spreadsheet for recurring client reporting, so the pack rebuilds itself each quarter." },
          { slug: "power-bi", why: "The reporting layer for firm-level and practice management data, with AI answering against the model." },
          { slug: "canva", why: "Client-facing material that looks professional without a design retainer." },
        ],
      },
      {
        heading: "Writing and admin",
        body: "Suitability letters, review summaries, the correspondence around advice. Drafting tools only — the content is yours and it is on file.",
        picks: [
          { slug: "grammarly", why: "Keeps client letters clean and consistent. Boring, and it is your name and your file." },
          { slug: "claude", why: "Explains a strategy in plain language for a client summary, at the reading level the client actually has." },
          { slug: "notion-ai", why: "Somewhere to keep process, templates and research notes that you can question rather than search." },
          { slug: "motion", why: "Keeps a review calendar and its deadlines ordered across a book of clients." },
        ],
      },
    ],
    watchOut: {
      title: "Compliance decides what you can use, not features",
      body: "Three constraints do most of the work here. Recordkeeping: in many jurisdictions client communications must be retained and supervisable, so a tool holding transcripts outside your firm's approved systems can put you out of compliance regardless of how good it is. Advice: nothing on this page should generate a recommendation, and a model's output about a client's situation is not suitability analysis — that is yours, documented, on file. Data: client financial and personal information in a consumer AI tier is a privacy problem and likely a regulatory one, so use business terms with a signed DPA. Check with your compliance function before the first client meeting is recorded, not after.",
    },
    guide:
      "<h2>How to pick AI tools as a financial advisor</h2><p>Ask your compliance function first. This sounds like the boring answer and it is the one that saves the money: a tool that records client conversations, retains transcripts and stores them outside your approved systems can breach recordkeeping rules however well it works. Advisors who buy first and ask later end up switching within a quarter.</p><p>Then buy the note-taker, because it is the clearest win in the role. Better contemporaneous records improve the service and satisfy supervision at the same time, and the whole category is $10 to $30 a month. Prefer one whose retention and export you can actually configure.</p><p>Keep generation and judgement separate. Use AI to draft the explanation of a strategy you have chosen and to read the documents behind it. Do not use it to arrive at the recommendation. The distinction is regulatory rather than philosophical: you have to be able to show why the advice suited the client, and \"the model suggested it\" is not that.</p><p>Prices on this page are per month at single-user rates. A practical stack — one note-taker, one assistant on business terms, one deck tool — lands around $45 to $75 a month; financial research platforms like Rogo are priced for firms and quoted rather than listed.</p>",
    faq: [
      {
        q: "Can AI give financial advice?",
        a: "It can generate text that reads like advice, which is not the same thing and is the problem. Regulated advice requires suitability analysis for a specific client, documented, by someone accountable for it. Use these tools to research faster, read documents closely and draft the explanation of a recommendation you made. The recommendation itself stays yours, on file, with your reasoning.",
      },
      {
        q: "Is it compliant to record client meetings with an AI note-taker?",
        a: "It depends on your jurisdiction and your firm's policy, and it is the first question to ask rather than the last. Consent, retention, where transcripts are stored and whether they are supervisable all matter. Many firms have approved a specific tool for exactly this reason — use theirs rather than adding your own.",
      },
      {
        q: "What is the best AI tool for financial research?",
        a: "<a href=\"/tool/rogo\">Rogo</a> if you want something built for financial analysis and your firm will buy it. Otherwise <a href=\"/tool/perplexity\">Perplexity</a> for cited orientation, <a href=\"/tool/claude\">Claude</a> for reading long filings closely, and <a href=\"/tool/julius\">Julius</a> when you need actual analysis run on an export rather than a model's impression of the numbers.",
      },
      {
        q: "Can I put client data into ChatGPT?",
        a: "Not on a consumer plan. Client financial and personal data needs business or enterprise terms with a data processing agreement, and even then your firm has to have approved it. The habit that works is describing the situation without identifiers when you want a general model's help thinking, and keeping anything client-identifiable inside approved systems.",
      },
    ],
  },

  // ------------------------------------------------------------- architects
  {
    slug: "architects",
    name: "Architects",
    lower: "architects",
    h1: "AI for Architects",
    metaTitle: "Best AI Tools for Architects & Designers (2026) | TAIFY",
    excerpt:
      "AI for concept visualisation, renders, interiors and site research, priced honestly — and a clear line between an image and a buildable drawing.",
    intro:
      "AI has landed hardest on the front of the process: concept imagery, mood, and client-facing visualisation now take minutes. It has barely touched documentation, coordination or compliance, which is where most of an architect's liability lives. That split explains everything on this page.",
    sections: [
      {
        heading: "Concept and visualisation",
        body: "Where the change is real. Generating twenty plausible massing or material studies before lunch changes how early conversations go — as long as everyone understands they are images.",
        picks: [
          { slug: "midjourney", why: "Still the best at architectural atmosphere and material feel. Where most concept boards start." },
          { slug: "adobe-firefly", why: "Commercially safer training provenance than most, which matters when imagery reaches a client deliverable." },
          { slug: "recraft", why: "Better control over style and consistency across a set, so a board looks like one project rather than twenty prompts." },
          { slug: "leonardo", why: "Fine-grained control and image-to-image work — useful for iterating on a sketch you already have." },
        ],
      },
      {
        heading: "Interiors, staging and renders",
        body: "Turning a plan or a photo into something a client can read. Mostly built for property rather than practice, and useful anyway.",
        picks: [
          { slug: "collov", why: "Interior schemes and material variations generated from a room, fast enough to do live in a client meeting." },
          { slug: "reimagine-home", why: "Redesigns an existing space from a photograph — the quickest route to a before-and-after for a refurbishment." },
          { slug: "virtual-staging-ai", why: "Furnishes empty rooms convincingly. Built for agents, equally useful for showing a completed scheme in use." },
        ],
      },
      {
        heading: "Site, plans and property data",
        body: "The research end. Less glamorous and often the part that decides whether a project is worth pursuing.",
        picks: [
          { slug: "getfloorplan", why: "Generates 2D and 3D floor plans and tours from basic inputs — good for early feasibility and marketing material." },
          { slug: "housecanary", why: "Valuation and market analytics on a site, which is the number a developer client will ask about first." },
          { slug: "reonomy", why: "Property and ownership intelligence for finding who actually controls a site before you approach it." },
          { slug: "perplexity", why: "Fast cited research on planning context, precedent and local policy, with links to the real documents." },
        ],
      },
      {
        heading: "Studio, documents and admin",
        body: "Practice management, not design. The unbilled overhead every small studio absorbs.",
        picks: [
          { slug: "figma", why: "Where boards, diagrams and client-facing presentation material get assembled, now with the repetitive layout work automated." },
          { slug: "gamma", why: "Planning-committee and client decks from an outline, in the time you have between site visits." },
          { slug: "claude", why: "Reads long planning documents, policy and specifications closely, and drafts the covering letter." },
          { slug: "notion-ai", why: "Project records and standard details you can question in plain English rather than digging through folders." },
        ],
      },
    ],
    watchOut: {
      title: "A render is not a drawing",
      body: "Generated imagery is not geometry. It does not resolve structure, it invents details that cannot be built, and it has no notion of building regulations, fire strategy, accessibility or a site boundary. Two practical consequences. First, do not let a concept image become a client expectation you cannot deliver — label it as a study, not a proposal. Second, nothing here substitutes for coordinated documentation or compliance checking, and a plan generated from a prompt should never leave the office as a drawing. Also check the licensing on imagery you commercialise: training provenance varies by tool and clients increasingly ask.",
    },
    guide:
      "<h2>How to pick AI tools as an architect</h2><p>Separate concept from documentation and buy only on the concept side. The tools worth money generate imagery, explore material and atmosphere, and produce client-facing visualisation. The documentation side — coordination, scheduling, compliance — is not solved by anything on this page, and products claiming otherwise are selling renders with an engineering vocabulary.</p><p>For imagery, licensing is the decision most practices underweight. If a generated image ends up in a planning submission or a marketing brochure, training provenance and commercial terms matter, which is the argument for Firefly over a tool with murkier sourcing even when the output is slightly worse. Ask before it is in a deliverable.</p><p>Manage client expectations explicitly. Generated concept imagery is more seductive and less constrained than a real proposal, and the gap between the render and the buildable scheme is where fee disputes start. Practices that use this well label the studies as studies and show the constraint conversation alongside them.</p><p>Prices on this page are per month at single-user rates. A concept stack of one image tool and one deck tool runs $20 to $40; property data platforms like HouseCanary and Reonomy are priced for professional users and quoted rather than listed.</p>",
    faq: [
      {
        q: "Can AI design a building?",
        a: "It can generate images of buildings, which is a different activity. There is no structure in a render, no coordination, no compliance with building regulations or fire strategy, and no site. What AI does well is expand the range of options you consider early and communicate an idea to a client quickly. The scheme, the drawings and the liability remain human.",
      },
      {
        q: "What is the best AI tool for architectural visualisation?",
        a: "<a href=\"/tool/midjourney\">Midjourney</a> for atmosphere and material quality, which is still ahead of the field. <a href=\"/tool/adobe-firefly\">Adobe Firefly</a> when commercial licensing matters more than the last few percent of image quality. <a href=\"/tool/recraft\">Recraft</a> when a whole board needs to look consistent. For interiors specifically, <a href=\"/tool/collov\">Collov AI</a> or <a href=\"/tool/reimagine-home\">REimagine Home</a>.",
      },
      {
        q: "Can I use AI-generated images in a planning application or client deliverable?",
        a: "Technically usually yes, commercially it depends on the tool's licence and training provenance, and professionally you should label what it is. The risk is less legal than expectational: an image showing something you cannot build creates a problem later in the project. Check the vendor's commercial terms and keep the studies clearly marked as studies.",
      },
      {
        q: "Is there AI for floor plans and drawings?",
        a: "<a href=\"/tool/getfloorplan\">GetFloorPlan</a> generates 2D and 3D plans and tours from basic inputs, which is genuinely useful for feasibility and marketing. It is not a substitute for coordinated construction documentation, and nothing currently listed here is. Treat generated plans as communication, not information for building.",
      },
    ],
  },

  // ------------------------------------------------------------ researchers
  {
    slug: "researchers",
    name: "Researchers",
    lower: "researchers",
    h1: "AI for Researchers",
    metaTitle: "Best AI Tools for Researchers & Academics (2026) | TAIFY",
    excerpt:
      "AI for literature review, reading, analysis and writing up, compared on real cost — plus the citation and disclosure problems that matter before submission.",
    intro:
      "Academic work has the best-developed AI tooling of any profession on this site, because the corpus is public and the tasks are well defined. Literature discovery and screening are transformed. Analysis is faster. Writing help is everywhere and is where journal policy, and the fabricated-citation problem, need your attention.",
    sections: [
      {
        heading: "Literature discovery and screening",
        body: "The part that used to take weeks. These search semantically rather than by keyword, which finds the paper you needed and did not know how to name.",
        picks: [
          { slug: "elicit", why: "Extracts trial and study characteristics into a comparable table — the single biggest saving in a systematic review workflow." },
          { slug: "consensus", why: "Answers a research question directly from published papers and shows how many support each direction." },
          { slug: "semantic-scholar", why: "Free, enormous, and the citation graph is the fastest way to see whether a finding held up." },
          { slug: "connected-papers", why: "Visual map of what surrounds a paper. Finds the adjacent literature a keyword search will never surface." },
          { slug: "researchrabbit", why: "Builds outward from papers you already trust and keeps alerting you as the field moves, on a free tier that covers a real review." },
        ],
      },
      {
        heading: "Reading, notes and evaluation",
        body: "Getting through the pile, and judging what is in it. The good tools here point at the page they took a claim from.",
        picks: [
          { slug: "scispace", why: "Explains dense passages in context, which makes reading outside your subfield viable rather than exhausting." },
          { slug: "notebooklm", why: "Upload your corpus and question those papers only, with citations to the page. The most reliable way to interrogate a reading set." },
          { slug: "scite", why: "Shows whether later work supported or contradicted a claim, rather than just that it was cited." },
          { slug: "perplexity", why: "Quick orientation on an unfamiliar area before you know the right search terms." },
        ],
      },
      {
        heading: "Data and analysis",
        body: "Analysis without a week of boilerplate. All of these show the code, which is the only version that belongs in reproducible work.",
        picks: [
          { slug: "julius", why: "Ask questions of a dataset in English; it writes and runs the code and shows both, so the method stays inspectable." },
          { slug: "deepnote", why: "Collaborative notebooks with AI assistance — the natural home for analysis a supervisor or co-author will read." },
          { slug: "hex", why: "Notebooks and reporting for analysis that needs to be reproducible and shared with a team." },
          { slug: "powerdrill", why: "Fast exploratory passes over several files when you are still working out what the data contains." },
        ],
      },
      {
        heading: "Writing, editing and submission",
        body: "Drafting help with a policy question attached. Check the target journal's disclosure rules before you use any of it on a manuscript.",
        picks: [
          { slug: "claude", why: "Best of the general models at long structured argument — restructuring a discussion section, tightening a methods paragraph." },
          { slug: "grammarly", why: "Consistent language correction, and the highest-value tool here if English is not your first language." },
          { slug: "quillbot", why: "Rephrasing your own sentences when they will not sit right. Note the plagiarism point in the warning below." },
          { slug: "notebooklm", why: "Also earns its place here: ask what your own sources say while writing, instead of hunting through PDFs." },
        ],
      },
    ],
    watchOut: {
      title: "Citations, paraphrasing and disclosure",
      body: "General models fabricate references that look correct — real journal, plausible authors, DOI that resolves to something else. Every citation must be opened and checked, and the tools that cite by design (Elicit, Consensus, Semantic Scholar, NotebookLM) are safer for exactly this reason. Paraphrasing tools carry a second risk: rewording someone else's argument without attribution is still plagiarism, and a paraphraser makes it easy to do accidentally. Third, disclosure — most journals and funders now have explicit rules on AI use in manuscripts and in peer review, and they differ. Read the target venue's policy before submission, not after a query. Using AI on a manuscript you are reviewing for someone else is prohibited nearly everywhere.",
    },
    guide:
      "<h2>How to pick AI tools for research</h2><p>Prioritise tools that cite. In academic work an answer without a traceable source is worthless, and the split between tools that retrieve from a real corpus and tools that generate from training data is the most important distinction on this page. Elicit, Consensus, Semantic Scholar and NotebookLM all show you where a claim came from; a general chatbot does not, and will produce a convincing reference that does not exist.</p><p>Then match the tool to the stage. Discovery wants semantic search and citation graphs — Semantic Scholar, which is free, and Connected Papers, whose free tier is enough. Screening wants extraction into a table, which is Elicit's whole purpose. Close reading wants a document-scoped tool over your own uploaded corpus. Analysis wants something that writes visible code. Using one general assistant for all four is the common mistake and produces the worst version of each.</p><p>Check your venue's policy early. Journal and funder rules on AI in manuscripts have tightened and vary, and the rules on using AI while peer reviewing someone else's work are close to universal prohibition. Knowing the policy before you draft is much easier than unpicking it at revision.</p><p>Prices on this page are per month at single-user rates. The remarkable thing about this page is how little you need to spend: Semantic Scholar and NotebookLM cost nothing outright, and Connected Papers, ResearchRabbit, Elicit and Consensus all have free tiers that cover a real review.</p>",
    faq: [
      {
        q: "What is the best AI tool for a literature review?",
        a: "<a href=\"/tool/elicit\">Elicit</a> for screening and extracting study characteristics into a table, which is where the time goes. <a href=\"/tool/consensus\">Consensus</a> for answering a specific question across the literature. <a href=\"/tool/connected-papers\">Connected Papers</a> and <a href=\"/tool/researchrabbit\">ResearchRabbit</a>, both usable on their free tiers, for finding the adjacent work keyword search misses. Use them together — they solve different halves of the problem.",
      },
      {
        q: "Will AI invent citations?",
        a: "General chatbots will, routinely and convincingly — correct-looking journal names, plausible author lists, DOIs that resolve elsewhere. Tools that retrieve from an actual corpus and link to the paper do not have this failure mode in the same way. The rule that protects you regardless: open every reference before it goes in the manuscript.",
      },
      {
        q: "Can I use AI to write my paper?",
        a: "For language, structure and tightening, most journals now permit it with disclosure. For generating substantive content, policies vary and several venues prohibit it. For peer reviewing someone else's manuscript, it is prohibited nearly everywhere and treated as a confidentiality breach. Read your target journal's policy before drafting — they are specific and they differ.",
      },
      {
        q: "Are there free AI research tools?",
        a: "Most of the best ones. <a href=\"/tool/semantic-scholar\">Semantic Scholar</a> and <a href=\"/tool/notebooklm\">NotebookLM</a> are free outright, and <a href=\"/tool/connected-papers\">Connected Papers</a>, <a href=\"/tool/researchrabbit\">ResearchRabbit</a>, Elicit, Consensus, SciSpace and Julius all have free tiers adequate for real work. A complete review workflow can cost nothing.",
      },
    ],
  },

  // ------------------------------------------------------------ freelancers
  {
    slug: "freelancers",
    name: "Freelancers",
    lower: "freelancers",
    h1: "AI for Freelancers",
    metaTitle: "Best AI Tools for Freelancers (2026) | TAIFY",
    excerpt:
      "AI for pitching, delivering, admin and getting found as a one-person business, with real monthly prices and the free tiers that are genuinely enough.",
    intro:
      "Freelancing is four jobs — finding work, doing work, invoicing for work, and marketing — carried by one person. AI is most useful on the three that are not the actual work. This page is ordered by where the hours leak, and priced for someone paying out of their own income rather than a department budget.",
    sections: [
      {
        heading: "Pitching, proposals and getting hired",
        body: "The unpaid part of the job. Faster proposals mean more of them, which is usually the difference in a slow month.",
        picks: [
          { slug: "claude", why: "Turns a scrappy brief into a structured proposal with scope and assumptions — the sections people skip and then regret." },
          { slug: "gamma", why: "A pitch deck from an outline in minutes, which is worth it when a prospect asks for one on Thursday for Friday." },
          { slug: "grammarly", why: "Stops the typo in the proposal that quietly costs you the credibility, and the job." },
          { slug: "notion-ai", why: "Keeps templates, rates and past proposals somewhere you can question rather than search." },
        ],
      },
      {
        heading: "Doing the work",
        body: "Depends entirely on your craft, so this is the general-purpose layer that helps most freelancers regardless of discipline.",
        picks: [
          { slug: "chatgpt", why: "The all-rounder: research, drafting, debugging a formula, translating, explaining something you half know." },
          { slug: "canva", why: "Whatever visual thing the client asked for that is not your specialism. Free tier covers most of it." },
          { slug: "quillbot", why: "Tightening and rephrasing your own copy when it will not sit right, at a low price." },
          { slug: "descript", why: "If any part of your delivery is audio or video, editing the transcript instead of the waveform is the single biggest saving available." },
        ],
      },
      {
        heading: "Admin, scheduling and the business bit",
        body: "The tax on working for yourself. Small savings that compound, and the category most freelancers under-invest in.",
        picks: [
          { slug: "motion", why: "Fits client work into the time you actually have and re-plans when a deadline moves, which it always does." },
          { slug: "reclaim-ai", why: "Protects deep-work blocks before calls fill the week. Cheaper than Motion and does the calendar half well." },
          { slug: "zapier", why: "Automates the repetitive handoffs — form to invoice to folder — that eat an hour a week invisibly." },
          { slug: "granola", why: "Client call notes that become a scope record, which is what you want when the brief later changes." },
        ],
      },
      {
        heading: "Marketing and getting found",
        body: "The thing that gets dropped when you are busy and matters most when you are not. Consistency beats quality here, which is exactly what automation is for.",
        picks: [
          { slug: "buffer", why: "Schedules the posting so it happens during a busy month. Free tier is enough for one person." },
          { slug: "taplio", why: "Built specifically for LinkedIn, which is where most freelance B2B work actually originates." },
          { slug: "publer", why: "Cheap multi-platform scheduling with AI assistance if you post across more than two networks." },
          { slug: "ahrefs", why: "If clients find you through search, this is how you learn what they type. Expensive — justified only once that channel earns." },
        ],
      },
    ],
    watchOut: {
      title: "Disclosure, data and the rate conversation",
      body: "Three things catch freelancers. First, client contracts increasingly include AI clauses, and some prohibit AI in delivered work entirely — read them, and disclose rather than assume. Second, free and consumer tiers may train on your input, which makes pasting a client's confidential brief into one a contract problem; if the work is under NDA, use a business tier or keep it out. Third, clients who know a task was AI-assisted will use it to argue your rate down. The defensible position is that you are charging for judgement and accountability rather than keystrokes, which is easier to hold if you never priced by the hour on those tasks in the first place.",
    },
    guide:
      "<h2>How to pick AI tools as a freelancer</h2><p>Spend on the leak, not the craft. Most freelancers buy a tool for the work itself and keep losing hours to proposals, scheduling and chasing invoices. Add up where last month actually went; the answer is usually admin and pitching, and that is where $20 a month changes something.</p><p>Stay on free tiers longer than feels right. Canva, ChatGPT, Buffer, Otter and Gamma all have free tiers that carry a one-person business a long way, and the discipline of only upgrading when you hit a wall you can name keeps the stack from becoming a subscription pile. Freelance income is lumpy; recurring costs are not.</p><p>Consolidate rather than collect. Four overlapping tools cost more than one you actually learn, and switching between them is its own tax. One general assistant, one visual tool, one scheduling or calendar tool and one note-taker covers nearly everything on this page.</p><p>Prices on this page are per month at single-user rates, divided down where the product bills annually. A complete working stack lands around $40 to $70 a month, and a competent free one is genuinely possible.</p>",
    faq: [
      {
        q: "What AI tools does a freelancer actually need?",
        a: "One general assistant (<a href=\"/tool/chatgpt\">ChatGPT</a> or <a href=\"/tool/claude\">Claude</a>), something visual (<a href=\"/tool/canva\">Canva</a>, free), and one thing that fixes your worst admin leak — usually a calendar tool like <a href=\"/tool/motion\">Motion</a> or a note-taker like <a href=\"/tool/granola\">Granola</a>. That is the whole list. Everything else is discipline-specific and should wait until you can name the problem it solves.",
      },
      {
        q: "Do I have to tell clients I used AI?",
        a: "Check the contract, because AI clauses are now common and some prohibit it outright in delivered work. Beyond the contract, disclosure is a judgement call that depends on what you were hired for — nobody expects disclosure that you used spellcheck, and a client who commissioned original illustration will care a great deal about generated images. Assume asking is cheaper than being found out.",
      },
      {
        q: "Will clients pay less if they know I use AI?",
        a: "Some will try. The position that holds is that the fee buys judgement, accountability and a result, not hours at a keyboard — which is much easier to argue if you are priced per project rather than per hour on the tasks AI accelerated. Freelancers who quote hourly on newly-fast work end up cutting their own rate.",
      },
      {
        q: "Can I run a freelance business on free AI tools?",
        a: "Largely yes. Canva, ChatGPT, Buffer, Otter and Gamma all have free tiers that cover real work for one person, and NotebookLM is free outright. Filter by free tier on <a href=\"/browse\">Browse</a> to see everything that qualifies, and upgrade only when you hit a limit you can name.",
      },
    ],
  },

  // ------------------------------------------------------------- podcasters
  {
    slug: "podcasters",
    name: "Podcasters",
    lower: "podcasters",
    h1: "AI for Podcasters",
    metaTitle: "Best AI Tools for Podcasters (2026) | TAIFY",
    excerpt:
      "AI for recording cleanup, editing, transcription, show notes and clips, with real prices — plus where synthetic voice needs disclosing.",
    intro:
      "Podcast production is the clearest case of AI removing a specialist bottleneck: editing, cleanup and repurposing used to need a producer and now largely do not. The tools below are ordered the way an episode actually moves, from a bad recording to clips nobody had time to cut.",
    sections: [
      {
        heading: "Recording and cleanup",
        body: "Rescuing what you captured. This category has improved more than any other here — a remote interview recorded badly is now often salvageable.",
        picks: [
          { slug: "adobe-podcast", why: "Speech enhancement that gets remarkably close to a studio re-record, on audio you would otherwise have binned. The free tier covers occasional rescues." },
          { slug: "krisp", why: "Removes background noise and echo live, during the recording, which is better than fixing it after." },
          { slug: "lalal-ai", why: "Separates voices, music and noise into stems — the fix when the interview and the café are on the same track." },
          { slug: "descript", why: "Also the cleanup hub: studio sound, filler-word removal and gap trimming in the same place you edit." },
        ],
      },
      {
        heading: "Editing and assembly",
        body: "Where the hours were. Editing by transcript rather than waveform is the change that let one person produce a show properly.",
        picks: [
          { slug: "descript", why: "Delete a sentence in the transcript and it is gone from the audio. The single biggest time saving in podcast production." },
          { slug: "opusclip", why: "Finds the moments worth clipping from a long episode, cuts them vertically and captions them. Otherwise an hour per clip." },
          { slug: "creatify", why: "Turns episode material into short video ads and promos when you are pushing an episode rather than just publishing it." },
          { slug: "canva", why: "Cover art, episode graphics and audiograms without a designer. Free tier covers it." },
        ],
      },
      {
        heading: "Voice, music and dubbing",
        body: "Synthetic audio, which is powerful and the one place on this page with a real ethics line. Read the warning before using any of it near a real person's voice.",
        picks: [
          { slug: "elevenlabs", why: "The best synthetic voice available, and the standard for dubbing an episode into other languages." },
          { slug: "murf", why: "Cheaper narration and voiceover for intros, ads and inserts where you do not need your own voice." },
          { slug: "suno", why: "Original theme music and beds, which sidesteps the licensing question entirely." },
          { slug: "udio", why: "The alternative music generator — worth trying both, they are good at different things." },
        ],
      },
      {
        heading: "Show notes, transcripts and discovery",
        body: "The publishing admin. It is also your search and accessibility surface, which is the argument for doing it properly rather than pasting a summary.",
        picks: [
          { slug: "assemblyai", why: "Accurate transcription with speaker labels through an API — the right choice if you publish transcripts every week." },
          { slug: "otter-ai", why: "Cheapest way to get a usable transcript without building anything. Free tier covers a small show." },
          { slug: "claude", why: "Turns a transcript into show notes, chapters, timestamps and a description that reads like a person wrote it." },
          { slug: "buffer", why: "Schedules the promotion so it happens on the weeks you are behind, which is all of them." },
        ],
      },
    ],
    watchOut: {
      title: "Voice cloning, licensing and the transcript you did not check",
      body: "Cloning someone's voice without explicit permission is a legal problem in a growing number of jurisdictions and a reputational one everywhere — including a guest's voice to fix a line they did not say. If a synthetic voice appears in an episode, disclose it. AI-generated music is generally licensable for commercial use, but terms differ by tool and by plan, so check before an episode with sponsors goes out. And treat published transcripts as published: a transcription error in a quotation is quotable, and it is now the searchable version of what your guest said.",
    },
    guide:
      "<h2>How to pick AI tools for podcasting</h2><p>Buy the editor first. Transcript-based editing is the one purchase that changes the production time of every future episode, and for most independent shows Descript alone replaces the reason you would have hired a producer. Everything else on this page is an improvement at the margin.</p><p>Fix problems as early in the chain as you can. Live noise suppression during recording beats cleanup afterwards, and cleanup beats trying to salvage a mix. A $10 tool at the recording stage removes work that a much better tool downstream can only partly undo.</p><p>Then decide whether you are publishing or promoting, because it changes what you need. Publishing needs transcription, show notes and cover art — nearly all of it cheap or free. Promoting needs clips, video and scheduling, which is where the spend goes. Shows that plateau usually have the first half sorted and none of the second.</p><p>Prices on this page are per month at single-user rates. Adobe Podcast, Otter and Canva all have workable free tiers, and a full independent stack — editor, clips, transcription, scheduling — lands around $60 to $100 a month.</p>",
    faq: [
      {
        q: "What is the best AI tool for editing a podcast?",
        a: "<a href=\"/tool/descript\">Descript</a>, without much competition. You edit the transcript and the audio follows, filler words and long gaps come out in one pass, and its studio-sound processing handles cleanup in the same place. For clipping episodes into short vertical video, add <a href=\"/tool/opusclip\">OpusClip</a>.",
      },
      {
        q: "Can AI fix a badly recorded interview?",
        a: "Often, yes — this is the most improved category in podcasting. <a href=\"/tool/adobe-podcast\">Adobe Podcast</a>'s speech enhancement gets startlingly close to a studio re-record on thin or roomy audio, and its free tier covers occasional use. <a href=\"/tool/lalal-ai\">LALAL.AI</a> separates voices from music and noise when they are stuck on one track. Neither recovers audio that clipped or dropped out.",
      },
      {
        q: "Should I use an AI voice for my podcast?",
        a: "For intros, ad reads, inserts and translated versions, it works and it is cheap. For anything presented as a real person's voice, disclose it, and never clone a guest without written permission — that is a legal exposure in an increasing number of places, quite apart from what it does to trust with your audience.",
      },
      {
        q: "How do I make show notes automatically?",
        a: "Transcribe, then summarise. <a href=\"/tool/otter-ai\">Otter.ai</a> or <a href=\"/tool/assemblyai\">AssemblyAI</a> for the transcript, then <a href=\"/tool/claude\">Claude</a> to turn it into notes, chapters and timestamps. Edit the result — the summary will get a name or a claim slightly wrong, and show notes are the version search engines index.",
      },
    ],
  },
];

// ---------------------------------------------------------------- lookups

const BY_SLUG = new Map(ROLES.map((r) => [r.slug, r]));
const BY_PATH = new Map(ROLES.map((r) => [`ai-for-${r.slug}`, r]));

export function roleBySlug(slug: string): Role | undefined {
  return BY_SLUG.get(slug);
}

/** Resolve a root-level URL segment, e.g. "ai-for-doctors". */
export function roleByPageSlug(pageSlug: string): Role | undefined {
  return BY_PATH.get(pageSlug);
}

/** Every role page slug — feeds RESERVED and the sitemap. */
export const ROLE_PAGE_SLUGS: string[] = ROLES.map((r) => `ai-for-${r.slug}`);

/** Flat, de-duplicated tool slugs a role recommends, in section order. */
export function rolePickSlugs(role: Role): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of role.sections) {
    for (const p of s.picks) {
      if (seen.has(p.slug)) continue;
      seen.add(p.slug);
      out.push(p.slug);
    }
  }
  return out;
}

/**
 * Throws if a role recommends a tool slug that no longer exists.
 *
 * Curated lists rot silently: rename a tool and the pick just stops rendering,
 * leaving a section short with nothing in the logs. Called from the role page so
 * a bad slug fails loudly in development instead of quietly shipping a thin
 * page. Checked against the seed catalog rather than the database, since that is
 * where slugs are defined.
 */
export function assertRolePicksExist(): void {
  const known = new Set(TOOLS.map((t) => t.slug));
  const missing: string[] = [];
  for (const role of ROLES) {
    for (const s of role.sections) {
      for (const p of s.picks) {
        if (!known.has(p.slug)) missing.push(`${role.slug} → ${p.slug}`);
      }
    }
  }
  if (missing.length) {
    throw new Error(`roles.ts references unknown tool slugs: ${missing.join(", ")}`);
  }
}
