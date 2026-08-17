import type { Metadata } from "next";
import { DashboardNav } from "@/components/admin/dashboard-nav";

export const metadata: Metadata = {
  title: "Tools admin | TAIFY",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardNav />
      {children}
    </>
  );
}
