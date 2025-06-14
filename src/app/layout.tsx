import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Day Progress Bar",
  description: "Track your day's progress",
};

// 防止水合错误的包装组件
function HydrationOverride({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased tongyi-design-pc" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <HydrationOverride>
            <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
              {/* Global Header */}
              <Header />

              {/* Main Content */}
              <main className="flex-grow">
                {children}
              </main>

              {/* Footer */}
              <footer className="w-full py-6 px-8 bg-white border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                  &copy; {new Date().getFullYear()} Day Progress Bar
                </div>
              </footer>
            </div>
          </HydrationOverride>
        </ClerkProvider>
      </body>
    </html>
  );
}
