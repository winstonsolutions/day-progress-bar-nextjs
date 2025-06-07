import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // 公开路由不需要认证
  publicRoutes: [
    "/",
    "/api/webhook(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/auth/clerk-callback(.*)"
  ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};