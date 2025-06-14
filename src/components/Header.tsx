"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';

export default function Header() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  // Prevent hydration errors
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Active link styling helper
  const isActive = (path: string) => {
    return pathname === path ? "text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600";
  };

  return (
    <header className="w-full py-4 px-8 bg-white shadow-sm flex justify-between items-center">
      <div className="flex items-center space-x-6">
        {/* Logo/Icon */}
        <Link href="/" className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
            <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-medium text-gray-900">Day Progress Bar</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden sm:flex items-center space-x-4">
          <Link href="/" className={`${isActive('/')} transition duration-200`}>
            Home
          </Link>
          <Link
            href={isClient && isLoaded && isSignedIn ? "/dashboard" : "/sign-in?redirect=/dashboard"}
            className={`${isActive('/dashboard')} transition duration-200`}
          >
            Dashboard
          </Link>
        </nav>
      </div>

      {/* Auth Button */}
      <div>
        {isClient && isLoaded && isSignedIn ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <Link
            href="/sign-in"
            className="px-6 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}