import { SearchBar } from "@/components/search-bar";
import { MatchResults } from "@/components/match-results";
import { TOOLS } from "@/data/tools";

export const metadata = {
  title: "AI Match - describe your task · TAIFY",
  description:
    "Describe what you're trying to do and get the best 3 AI tools with reasoning.",
};

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <div className="eyebrow mb-3">AI Match · answers, not a list</div>
        <h1 className="text-[clamp(24px,4vw,38px)] font-extrabold tracking-[-0.035em]">
          {query ? "Here's what fits" : "Describe your task"}
        </h1>
        {!query && (
          <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
            One sentence about the job you&apos;re doing. We read the whole
            catalog and return the three tools worth your time - with reasons.
          </p>
        )}
      </div>

      {query ? (
        <MatchResults query={query} tools={TOOLS} />
      ) : (
        <SearchBar autoFocus />
      )}
    </div>
  );
}
