import { notFound } from "next/navigation";
import { getPostForEdit } from "@/lib/blog/data";
import { PostEditor } from "@/components/blog/post-editor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostForEdit(slug);
  if (!post) notFound();
  return <PostEditor isNew={false} initial={post} />;
}
