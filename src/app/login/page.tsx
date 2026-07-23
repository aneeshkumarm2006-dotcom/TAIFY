import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in · TAIFY",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <div className="eyebrow mb-3">Team access</div>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Sign in</h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Enter the shared team password to manage tools and publish posts.
      </p>
      <LoginForm next={next} />
    </div>
  );
}
