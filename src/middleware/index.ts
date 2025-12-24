import { defineMiddleware } from 'astro:middleware';

import { supabaseClient } from '../db/supabase.client.ts';
import { supabaseAdmin } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  // Inject Supabase clients into context
  context.locals.supabase = supabaseClient;
  context.locals.supabaseAdmin = supabaseAdmin;

  // Get current user session
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;

  // Handle landing page redirect logic
  if (context.url.pathname === '/') {
    if (user) {
      // User is authenticated - check if onboarded
      const isOnboarded = user.user_metadata?.onboarded === true;
      
      if (isOnboarded) {
        // Redirect to map view
        return context.redirect('/map', 302);
      } else {
        // Redirect to onboarding
        return context.redirect('/onboarding/step-1', 302);
      }
    }
    // User not authenticated - continue to landing page
  }

  return next();
});

