# Security Incident Response: Rotating Supabase Service Role Key

## ⚠️ CRITICAL: Your service role key was exposed in the build output

The service role key `sb_secret_6KmjWlGGWYZ15rSOVdSzmA_w9YDGqWL` was previously hardcoded in the bundled JavaScript files and may have been exposed publicly.

## Immediate Actions Required

### Step 1: Rotate the Service Role Key

1. **Log in to Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project: `grzexeutiyceerimvlbe`

2. **Generate New Service Role Key**
   - Navigate to **Settings** → **API**
   - Scroll to **Service role key** section
   - Click **"Generate new service_role key"** or **"Reset service_role secret"**
   - ⚠️ **Save the new key immediately** - you won't be able to see it again!

3. **Copy the New Key**
   - The new key will start with `eyJhbG...` (JWT format)
   - Keep it in a secure location (password manager recommended)

### Step 2: Update Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Environment Variables**

2. **Update the Service Role Key**
   - Find `SUPABASE_SERVICE_ROLE_KEY`
   - Click **Edit** (pencil icon)
   - Replace with the new key from Step 1
   - Make sure it's enabled for:
     - ✅ Production
     - ✅ Preview (optional but recommended)
     - ❌ Development (use local `.env` file instead)
   - Click **Save**

3. **Trigger Redeploy**
   - Go to **Deployments** tab
   - Click the **three dots** (•••) on the latest deployment
   - Select **Redeploy**
   - Wait for deployment to complete

### Step 3: Update Local Development Environment

1. **Update your local `.env` file**
   ```bash
   # Edit your .env file
   nano .env
   
   # Update only the service role key (keep the URL and anon key as is)
   SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key-here
   ```

2. **Test locally**
   ```bash
   npm run dev
   # Verify authentication and admin operations work
   ```

### Step 4: Verify the Fix

1. **Check Production Deployment**
   - Visit your production site
   - Test authentication flows (login, register)
   - Verify admin operations work (photo uploads, etc.)

2. **Verify Key is Not Exposed**
   - Open browser DevTools (F12)
   - Go to **Sources** tab
   - Search for `sb_secret` in the bundled files
   - ✅ Should return **no results**

## What Happened?

### The Problem

The previous configuration had:

```typescript
// ❌ INSECURE: Key was bundled at build time
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(url, supabaseServiceRoleKey);
```

When Vite/Astro built the project, it replaced `import.meta.env.SUPABASE_SERVICE_ROLE_KEY` with the actual key value, resulting in:

```javascript
// Bundled output - KEY EXPOSED!
const supabaseServiceRoleKey = "sb_secret_6KmjWlGGWYZ15rSOVdSzmA_w9YDGqWL";
export const supabaseAdmin = createClient(url, "sb_secret_6KmjWlGGWYZ15rSOVdSzmA_w9YDGqWL");
```

### The Fix

The new secure configuration:

```typescript
// ✅ SECURE: Key is passed at runtime
export function createSupabaseAdmin(serviceRoleKey: string) {
  return createClient(url, serviceRoleKey);
}

// In middleware - key loaded at runtime from Vercel environment
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
context.locals.supabaseAdmin = createSupabaseAdmin(serviceRoleKey);
```

Now the bundled output contains:

```javascript
// Bundled output - NO KEY EXPOSED
function createSupabaseAdmin(serviceRoleKey) {
  return createClient(url, serviceRoleKey);
}
// Key is provided at runtime from environment variables
```

## Why Service Role Key is Dangerous

The service role key has **FULL ADMIN ACCESS** and can:

- ✅ Bypass all Row Level Security (RLS) policies
- ✅ Read/write/delete ANY data in ANY table
- ✅ Create/modify database schema
- ✅ Access all user data
- ✅ Impersonate any user

**If an attacker gets this key, they have complete control over your database.**

## Review Supabase Access Logs

Check if there was any unauthorized access:

1. **Go to Supabase Dashboard**
   - Navigate to **Logs** → **API**

2. **Filter by Date**
   - Set date range to when the key was potentially exposed
   - Look for unusual patterns:
     - High request volumes
     - Requests from unknown IP addresses
     - Access to sensitive tables
     - Failed authentication attempts

3. **Check Database Activity**
   - Navigate to **Database** → **Query Logs**
   - Look for suspicious queries:
     - Mass data exports
     - Unauthorized data modifications
     - Schema changes

## Prevention Measures (Already Implemented)

✅ **Service role key is now loaded at runtime** - not bundled in the build

✅ **`.env.local` deleted** - production secrets no longer in repository

✅ **Proper documentation** - team knows how to handle secrets

✅ **Secure middleware** - admin client created per-request with runtime key

## Additional Security Recommendations

### 1. Enable Supabase Security Features

- **IP Allowlisting**: Restrict API access to Vercel's IP ranges
- **Rate Limiting**: Configure in Supabase dashboard
- **RLS Policies**: Ensure all tables have proper Row Level Security

### 2. Monitor and Alert

- Set up Supabase alerts for:
  - Unusual API usage patterns
  - High error rates
  - Database schema changes

### 3. Regular Security Audits

- Review environment variables quarterly
- Audit database access patterns
- Update dependencies regularly
- Run security scans on codebase

### 4. Team Education

- Never commit secrets to Git
- Use environment variables for all sensitive data
- Understand the difference between public and private env vars
- Know the incident response procedure

## Checklist

Use this checklist to ensure all steps are completed:

- [ ] Generated new service role key in Supabase
- [ ] Saved new key securely (password manager)
- [ ] Updated `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- [ ] Redeployed application on Vercel
- [ ] Updated local `.env` file with new key
- [ ] Tested production application
- [ ] Verified key is not exposed in bundle
- [ ] Reviewed Supabase access logs for suspicious activity
- [ ] Documented incident date and actions taken
- [ ] Notified team members (if applicable)

## Questions?

If you have questions about this incident or the security measures:

1. Review the [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
2. Check [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
3. Consult with your security team

## Prevention Going Forward

✅ The code changes have been made to prevent this from happening again.

✅ Always use Vercel environment variables for production secrets.

✅ Never use `.env.local` for production values.

✅ Follow the deployment guide for all future deployments.
