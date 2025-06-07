import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
    <html lang="en" className="antialiased tongyi-design-pc">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <ClerkProvider>
          <HydrationOverride>
            {children}
          </HydrationOverride>
        </ClerkProvider>
      </body>
    </html>
  );
}
