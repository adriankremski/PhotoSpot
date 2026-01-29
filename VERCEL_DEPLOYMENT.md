# Vercel Deployment Guide

This guide explains how to securely deploy PhotoSpot to Vercel with proper environment variable configuration.

## Prerequisites

- A Vercel account
- A production Supabase project
- Git repository connected to Vercel

## Security Best Practices

⚠️ **CRITICAL**: Never commit production secrets to your repository!

- `.env.local` is gitignored and should contain local development overrides only
- Production secrets must be configured in Vercel's environment variables dashboard
- The `SUPABASE_SERVICE_ROLE_KEY` has admin privileges and must never be exposed to the browser

## Environment Variables Setup

### 1. In Vercel Dashboard

Navigate to your project settings → Environment Variables and add the following:

#### Public Variables (Available to Browser)
These are safe to expose and will be embedded in the client-side bundle:

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `PUBLIC_SUPABASE_KEY` | Supabase anon/public key | `eyJhbG...` (starts with `eyJ`) |
| `PUBLIC_MAPBOX_TOKEN` | Mapbox access token | `pk.eyJ1...` (starts with `pk.`) |

#### Server-Only Variables (Never Exposed)
These are only available on the server-side and are never bundled:

| Variable Name | Description | Security Level |
|--------------|-------------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | 🔴 **CRITICAL** - Has admin access |
| `OPENROUTER_API_KEY` | OpenRouter API key | 🟡 **SENSITIVE** |

### 2. Environment Scopes in Vercel

Set environment variables for the appropriate scopes:

- ✅ **Production**: Always required
- ✅ **Preview**: Recommended for testing PRs
- ⚠️ **Development**: Optional (use local `.env` instead)

### 3. Getting Your Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL**: Use for `PUBLIC_SUPABASE_URL`
   - **anon/public key**: Use for `PUBLIC_SUPABASE_KEY`
   - **service_role key**: Use for `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Local Development

For local development, use the `.env` file (gitignored):

```bash
# Copy the example file
cp .env.example .env

# Edit with your local Supabase credentials (from `supabase start`)
nano .env
```

### Local Supabase Setup

If using Supabase locally:

```bash
# Start Supabase locally
supabase start

# Use these values in your .env:
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Deployment Process

### Initial Setup

1. **Connect your repository** to Vercel
2. **Configure environment variables** in Vercel dashboard (as described above)
3. **Deploy** - Vercel will automatically build and deploy

### Subsequent Deployments

Simply push to your repository:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel will automatically:
- Build your application with the Vercel adapter
- Inject environment variables at runtime (server-side only for private vars)
- Deploy to production

## How It Works

### Environment Variable Handling

#### Public Variables (PUBLIC_* prefix)
- **Build time**: Vite replaces `import.meta.env.PUBLIC_*` with actual values
- **Result**: Values are embedded in the client bundle
- **Security**: ✅ Safe - these are meant to be public

#### Private Variables (no PUBLIC_ prefix)
- **Build time**: NOT embedded in the bundle
- **Runtime**: Loaded from Vercel's environment at runtime
- **Result**: Never exposed to the client
- **Security**: ✅ Secure - only available on server

### Supabase Admin Client

The service role key is handled securely:

```typescript
// ❌ OLD WAY (Insecure - bundled at build time)
export const supabaseAdmin = createClient(url, serviceRoleKey);

// ✅ NEW WAY (Secure - created at runtime)
export function createSupabaseAdmin(serviceRoleKey: string) {
  return createClient(url, serviceRoleKey);
}

// In middleware - key loaded at runtime from environment
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
context.locals.supabaseAdmin = createSupabaseAdmin(serviceRoleKey);
```

## Security Incident Response

### If Service Role Key is Exposed

1. **Immediately rotate** the key in Supabase dashboard:
   - Go to Settings → API
   - Click "Generate new service_role key"
2. **Update** the environment variable in Vercel
3. **Redeploy** to production
4. **Review** access logs in Supabase for unauthorized access

### If Anon Key is Exposed

✅ This is okay! The anon key is meant to be public and is protected by:
- Row Level Security (RLS) policies in Supabase
- API rate limiting
- Domain restrictions (if configured)

## Troubleshooting

### Build Errors

**Error**: `Cannot use import statement outside a module`
- **Cause**: Supabase is being bundled incorrectly
- **Solution**: Ensure `astro.config.mjs` has the Rollup external configuration:

```javascript
vite: {
  build: {
    rollupOptions: {
      external: ["@supabase/supabase-js"],
    },
  },
}
```

### Environment Variables Not Working

1. **Check Vercel dashboard**: Ensure variables are set correctly
2. **Check scopes**: Make sure variables are enabled for Production
3. **Redeploy**: Trigger a new deployment after changing variables
4. **Check names**: Variable names are case-sensitive and must match exactly

### 404 on Deployment

- **Cause**: Wrong adapter or missing configuration
- **Solution**: Use `@astrojs/vercel` adapter (not `@astrojs/node`)

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [Astro Vercel Adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/)
