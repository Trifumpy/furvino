import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { getUserByExternalId } from "./app/api/users";
import { syncUser } from "./utils/clerk";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isUserRoute = createRouteMatcher(["/profile(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const requireAdmin = isAdminRoute(req);
  const requireUser = requireAdmin || isUserRoute(req);

  if (!requireUser) return;

  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    // Redirect to sign-in page if user is not authenticated
    await auth.protect();
    return;
  }

  let user = await getUserByExternalId(clerkId);

  if (!user) {
    user = await syncUser(clerkId);
  }

  if (requireAdmin) {
    if (!user || !user.roles.includes("admin")) {
      // Redirect to 403 Forbidden if user is not an admin
      return new Response(null, {
        status: 403,
        statusText: "Forbidden",
      });
    }
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
