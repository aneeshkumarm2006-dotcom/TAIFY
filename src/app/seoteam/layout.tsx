import type { Metadata } from "next";
import { DashboardNav } from "@/components/admin/dashboard-nav";

export const metadata: Metadata = {
  title: "SEO blog · TAIFY",
  robots: { index: false, follow: false },
};

export default function SeoTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardNav />
      {children}
    </>
  );
}
