import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import { CATEGORIES } from "@/data/tools";
import { ToolDetail, buildFaqs } from "@/components/tool-detail";
import { getRelated } from "@/lib/data";
import { submissionsCollection } from "@/lib/db/mongo";
import {
  draftFromSubmission,
  normalizeDraft,
  previewTool,
} from "@/lib/submissions/draft";

/**
 * A submission's draft rendered as the tool page it would become.
 *
 * Lives outside /admin because the admin layout puts the dashboard nav on every
 * page under it, and nested layouts compose rather than replace - inside an
 * iframe that nav would be sitting in the middle of the preview. Access is
 * still gated: /preview is in the protected list in src/proxy.ts.
 */

export const metadata: Metadata = {
  title: "Draft preview | TAIFY",
  robots: { index: false, follow: false },
};

// Always the draft as it was last saved, never a cached copy of it.
export const dynamic = "force-dynamic";

export default async function SubmissionPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const col = await submissionsCollection();
  if (!col) notFound();

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    notFound();
  }

  const sub = await col.findOne({ _id: oid });
  if (!sub) notFound();

  const tool = previewTool(
    normalizeDraft(sub.draft ?? draftFromSubmission(sub)),
  );
  const related = await getRelated(tool, 3);
  const categoryName =
    CATEGORIES.find((c) => c.slug === tool.category)?.name ?? tool.category;
  const faqs = buildFaqs(tool, categoryName, related.map((r) => r.name));

  return (
    <>
      <div className="border-b border-line bg-accent-wash px-6 py-2">
        <p className="mono mx-auto max-w-6xl text-[11.5px] text-accent-ink">
          Draft preview · not published · /tool/{tool.slug}
        </p>
      </div>
      <ToolDetail tool={tool} related={related} faqs={faqs} />
    </>
  );
}
