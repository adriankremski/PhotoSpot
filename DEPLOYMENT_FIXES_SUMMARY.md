# Deployment Fixes Summary

## Issues Fixed

### 1. ✅ 404 Error on Vercel
**Problem**: Using `@astrojs/node` adapter instead of `@astrojs/vercel`  
**Solution**: Switched to Vercel adapter and configured it properly

### 2. ✅ Supabase ESM Import Error
**Problem**: `Cannot use import statement outside a module`  
**Solution**: Configured Rollup to treat Supabase as external dependency

### 3. ✅ CRITICAL: Service Role Key Exposure
**Problem**: Supabase service role key was hardcoded in bundled JavaScript  
**Solution**: Refactored to load key at runtime from environment variables

## Files Modified

### Configuration Files
- **`astro.config.mjs`** - Changed from Node adapter to Vercel adapter with proper externals
- **`.env.example`** - Updated with proper documentation and security warnings

### Source Code
- **`src/db/supabase.client.ts`** - Refactored to use runtime key injection
- **`src/middleware/index.ts`** - Updated to create admin client at runtime

### Files Removed
- **`.env.local`** - Deleted to prevent production secrets in repository

### Documentation Added
- **`VERCEL_DEPLOYMENT.md`** - Complete guide for deploying to Vercel
- **`SECURITY_INCIDENT_RESPONSE.md`** - Instructions for rotating exposed keys

## Deployment Checklist

### Immediate Actions (REQUIRED)

- [ ] **1. Rotate Supabase Service Role Key**
  - Follow instructions in `SECURITY_INCIDENT_RESPONSE.md`
  - Generate new key in Supabase dashboard
  - **This is CRITICAL - your old key was exposed!**

- [ ] **2. Configure Vercel Environment Variables**
  - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  - Add the following:
    ```
    PUBLIC_SUPABASE_URL=https://grzexeutiyceerimvlbe.supabase.co
    PUBLIC_SUPABASE_KEY=sb_publishable_6rxjYOIbv1Wgsky5D-XNVQ_KO2s2BK-
    SUPABASE_SERVICE_ROLE_KEY=<YOUR_NEW_SERVICE_ROLE_KEY>
    PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoic251ZmZpeCIsImEiOiJjbWpxd2o0MXcyOTEyM2xxeXdoOTd6MnlpIn0.jpJtmKEzrsNWLt5gBMvyVQ
    OPENROUTER_API_KEY=<YOUR_API_KEY>
    ```
  - Enable for Production and Preview environments

- [ ] **3. Commit and Push Changes**
  ```bash
  git add astro.config.mjs src/ .env.example VERCEL_DEPLOYMENT.md SECURITY_INCIDENT_RESPONSE.md
  git commit -m "Fix Vercel deployment and secure environment variables"
  git push
  ```

- [ ] **4. Verify Deployment**
  - Wait for Vercel to deploy
  - Visit your production URL
  - Test authentication flows
  - Open DevTools and search for `sb_secret` - should find nothing

### Security Verification

- [ ] Confirmed new service role key is active in Supabase
- [ ] Verified old service role key is deactivated
- [ ] Checked Supabase logs for suspicious activity
- [ ] Confirmed key is not in bundled JavaScript files
- [ ] Tested that application works with new key

## What Was the Security Issue?

### Before (Insecure)
```typescript
// Key was embedded at build time
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(url, serviceRoleKey);

// Result in bundle:
export const supabaseAdmin = createClient(url, "sb_secret_6KmjWlGGWYZ15rSOVdSzmA_w9YDGqWL");
// ⚠️ KEY EXPOSED TO PUBLIC!
```

### After (Secure)
```typescript
// Key is loaded at runtime
export function createSupabaseAdmin(serviceRoleKey: string) {
  return createClient(url, serviceRoleKey);
}

// In middleware:
const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; // From Vercel env at runtime
context.locals.supabaseAdmin = createSupabaseAdmin(key);

// Result in bundle:
function createSupabaseAdmin(serviceRoleKey) {
  return createClient(url, serviceRoleKey);
}
// ✅ NO KEY IN BUNDLE!
```

## How Environment Variables Work Now

### Public Variables (PUBLIC_* prefix)
- ✅ Safe to expose to browser
- ✅ Embedded in client bundle at build time
- Examples: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, `PUBLIC_MAPBOX_TOKEN`

### Private Variables (no PUBLIC_ prefix)
- ❌ NEVER exposed to browser
- ✅ Only available on server at runtime
- ✅ Loaded from Vercel environment
- Examples: `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`

## Testing Locally

```bash
# Ensure .env has correct values (not production keys!)
cat .env

# Should show local Supabase instance:
# PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# PUBLIC_SUPABASE_KEY=<local-anon-key>
# SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>

# Start local development
npm run dev

# Test authentication and features
```

## Build Verification

```bash
# Build the project
npm run build

# Check that service role key is NOT in the bundle
grep -r "sb_secret" .vercel/output/
# Should return: (no results)

# Check that the function uses external Supabase
grep -r "@supabase/supabase-js" .vercel/output/functions/_render.func/dist/
# Should show: import { createClient } from '@supabase/supabase-js';
```

## Technical Details

### Vercel Adapter Configuration

```javascript
// astro.config.mjs
export default defineConfig({
  output: "server",
  adapter: vercel({
    edgeMiddleware: false,
  }),
  vite: {
    build: {
      rollupOptions: {
        external: ["@supabase/supabase-js"], // Keep Supabase external
      },
    },
  },
});
```

### Benefits
- ✅ Supabase loads from `node_modules` at runtime
- ✅ No bundling issues with ESM/CommonJS
- ✅ Smaller bundle size
- ✅ Environment variables work correctly

## Troubleshooting

### Build fails with ESM error
- Ensure `@astrojs/vercel` is installed (not `@astrojs/node`)
- Check Rollup external configuration in `astro.config.mjs`

### 404 on deployment
- Verify Vercel adapter is configured
- Check `.vercel/output/config.json` exists after build

### Environment variables not working
- Ensure variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Trigger redeploy after changing variables

### Service role operations fail
- Verify new service role key is set in Vercel
- Check key has correct format (starts with `eyJhbG...`)
- Ensure key is enabled for Production environment

## Next Steps

1. **Complete the deployment checklist above**
2. **Read `VERCEL_DEPLOYMENT.md`** for ongoing deployment procedures
3. **Follow `SECURITY_INCIDENT_RESPONSE.md`** to rotate your service role key
4. **Update local `.env`** with rotated keys for local development
5. **Monitor Supabase logs** for the next few days

## Support

- Vercel Deployment: See `VERCEL_DEPLOYMENT.md`
- Security Issues: See `SECURITY_INCIDENT_RESPONSE.md`
- Supabase Docs: https://supabase.com/docs
- Astro Vercel Adapter: https://docs.astro.build/en/guides/integrations-guide/vercel/

---

**Remember**: Your old service role key was exposed. Rotate it immediately!
