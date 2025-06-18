import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import DashboardAuthSync from "@/components/dashboard/DashboardAuthSync";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="py-6">
      <DashboardAuthSync />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}