import type { ReactNode } from "react";
import { TopNav } from "@/components/nav/top-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 py-2.5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-app rounded-card bg-white p-4 shadow-card sm:p-7">
        <TopNav />
        <div className="divider my-5 sm:my-6" />
        <main>{children}</main>
      </div>
    </div>
  );
}
