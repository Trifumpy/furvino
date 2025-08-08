import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isUserRoute = createRouteMatcher(["/profile(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const requireUser = isUserRoute(req);

  if (!requireUser) return;
  
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    // Redirect to sign-in page if user is not authenticated
    await auth.protect();
    return;
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
