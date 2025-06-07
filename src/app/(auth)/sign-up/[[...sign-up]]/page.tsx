import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
        <p className="text-gray-600">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-blue-600 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      </div>

      <div className="w-full">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg rounded-lg",
            }
          }}
          routing="path"
          path="/sign-up"
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}