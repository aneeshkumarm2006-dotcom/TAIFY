"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(next && next.startsWith("/") ? next : "/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Team password"
        autoComplete="current-password"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="rounded-lg border border-line-strong bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
      />
      {error && <p className="text-[13px] text-accent-ink">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-ink disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
