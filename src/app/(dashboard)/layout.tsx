import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Keep UserButton accessible but hidden for authentication functionality */}
      <div className="hidden">
        <UserButton afterSignOutUrl="/" />
      </div>

      <main className="py-6">
        <div className="max-w-3xl mx-auto px-4">
          {children}
        </div>
      </main>
    </div>
  );
}