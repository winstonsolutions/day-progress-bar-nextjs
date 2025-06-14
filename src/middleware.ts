import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define which routes are public and don't require authentication
const publicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth/clerk-callback(.*)"
];

// Create a matcher for dashboard routes
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

// Create a matcher function to check if the current path is public
const isPublicRoute = createRouteMatcher(publicRoutes);

// Initialize Clerk middleware with auth protection
export default clerkMiddleware(async (auth, req) => {
  // If the user is trying to access a protected route without being authenticated
  if (isDashboardRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // Redirect unauthenticated users to sign in
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Allow access to public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};