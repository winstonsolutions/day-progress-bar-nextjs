"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const extensionId = searchParams.get('extension_id');

  // Build the afterSignInUrl with the extension_id parameter if available
  const afterSignInUrl = extensionId
    ? `/dashboard?extension_id=${extensionId}`
    : "/dashboard";

  return (
    <div className="w-full max-w-md px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Sign In</h1>
        <p className="text-gray-600">
          Don't have an account?{" "}
          <Link
            href={extensionId ? `/sign-up?extension_id=${extensionId}` : "/sign-up"}
            className="text-blue-600 hover:text-blue-800"
          >
            Sign up
          </Link>
        </p>
      </div>

      <div className="w-full">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg rounded-lg",
            }
          }}
          routing="path"
          path="/sign-in"
          afterSignInUrl={afterSignInUrl}
        />
      </div>
    </div>
  );
}