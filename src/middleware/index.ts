import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";
import { supabaseAdmin } from "../db/supabase.client.ts";

/**
 * Public routes that don't require authentication or onboarding
 */
const PUBLIC_ROUTES = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/logout"];

/**
 * Routes that authenticated users can access without completing onboarding
 */
const ONBOARDING_ALLOWED_ROUTES = [
  "/onboarding",
  "/api/auth/update-metadata",
  "/api/users", // User profile endpoints
];

/**
 * Check if a route is public (accessible without authentication)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Check if a route is allowed during onboarding
 */
function isOnboardingAllowedRoute(pathname: string): boolean {
  return ONBOARDING_ALLOWED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Inject Supabase clients into context
  context.locals.supabase = supabaseClient;
  context.locals.supabaseAdmin = supabaseAdmin;

  // Get current user session
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  const user = session?.user ?? null;

  // Add session and user to locals for use in pages
  context.locals.session = session;
  context.locals.user = user;

  // Handle landing page redirect logic
  if (pathname === "/") {
    if (user) {
      // User is authenticated - check if onboarded
      const isOnboarded = user.user_metadata?.onboardingCompleted === true;

      if (isOnboarded) {
        // Redirect to map view
        return context.redirect("/map", 302);
      } else {
        // Redirect to onboarding
        return context.redirect("/onboarding", 302);
      }
    }
    // User not authenticated - continue to landing page
    return next();
  }

  // Redirect authenticated users away from login/register pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    const isOnboarded = user.user_metadata?.onboardingCompleted === true;
    return context.redirect(isOnboarded ? "/map" : "/onboarding", 302);
  }

  // Handle authenticated routes
  if (user) {
    const isOnboarded = user.user_metadata?.onboardingCompleted === true;

    // If user is not onboarded and trying to access a protected route
    if (!isOnboarded && !isOnboardingAllowedRoute(pathname) && !isPublicRoute(pathname)) {
      return context.redirect("/onboarding", 302);
    }

    // If user is onboarded and trying to access onboarding page, redirect to map
    if (isOnboarded && pathname === "/onboarding") {
      return context.redirect("/map", 302);
    }
  }

  return next();
});
