import { SubmissionWorkspace } from "@/components/admin/submission-workspace";

export default async function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
      <SubmissionWorkspace id={id} />
    </div>
  );
}
