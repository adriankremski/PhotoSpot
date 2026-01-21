# Map View - Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Quality

- [x] All linter errors resolved
- [x] TypeScript strict mode passes
- [x] Build succeeds without errors
- [x] Tests passing (unit + component)
- [ ] E2E tests passing (optional)

### ✅ Configuration

- [ ] Environment variables configured
- [ ] Mapbox token added
- [ ] Supabase credentials set
- [ ] API endpoints verified
- [ ] Database migrations applied

### ✅ Performance

- [x] Build time acceptable (<20s)
- [x] Bundle sizes optimized
- [x] Images lazy loading
- [x] Debouncing implemented
- [ ] Performance metrics baseline

### ✅ Security

- [ ] Environment variables not committed
- [ ] API keys rotated for production
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection protection verified

### ✅ Monitoring

- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring enabled
- [ ] Logging configured
- [ ] Alerts set up
- [ ] Health check endpoint

---

## Environment Configuration

### Development (.env.local)

```env
# Supabase
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_key

# Mapbox
PUBLIC_MAPBOX_TOKEN=pk.your_development_token

# Other
NODE_ENV=development
```

### Production (.env.production)

```env
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# Mapbox
PUBLIC_MAPBOX_TOKEN=pk.your_production_token

# Error Tracking
PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Other
NODE_ENV=production
```

### Important Notes

- Never commit `.env` files
- Use different tokens for dev/staging/prod
- Rotate keys periodically
- Limit Mapbox token to your domain

---

## Build Process

### Local Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview build
npm run preview
```

### CI/CD Build

```yaml
# Example GitHub Actions
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        env:
          PUBLIC_MAPBOX_TOKEN: ${{ secrets.MAPBOX_TOKEN }}
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          PUBLIC_SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: npm run build

      - name: Run tests
        run: npm run test:run
```

---

## Deployment Platforms

### Vercel (Recommended)

**Setup:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Configuration:**

1. Connect GitHub repository
2. Add environment variables in dashboard
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

**Environment Variables:**

- Add all `PUBLIC_*` variables
- Add `SUPABASE_SERVICE_ROLE_KEY`
- Enable "Automatically expose System Environment Variables"

### Netlify

**Setup:**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Configuration:**

1. Connect repository
2. Build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Add environment variables
4. Configure headers and redirects

**netlify.toml:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

### Self-Hosted (Node.js)

**Setup:**

```bash
# Build
npm run build

# Start server
node dist/server/entry.mjs
```

**PM2 Configuration:**

```json
{
  "apps": [
    {
      "name": "photospot",
      "script": "./dist/server/entry.mjs",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3000
      }
    }
  ]
}
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name photospot.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Database Migrations

### Supabase Production

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Verify
supabase db diff
```

### Manual Migration

```sql
-- Verify public_photos_v view exists
SELECT * FROM information_schema.views
WHERE table_name = 'public_photos_v';

-- Test query
SELECT * FROM public_photos_v
WHERE status = 'approved'
LIMIT 10;
```

---

## Mapbox Configuration

### Token Setup

1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Create new token for production
3. Set URL restrictions:
   - `https://yourdomain.com/*`
   - `https://www.yourdomain.com/*`
4. Enable scopes:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`

### Usage Monitoring

**Free Tier Limits:**

- 50,000 map loads/month
- 100,000 tile requests/month

**Monitor Usage:**

- Dashboard > Statistics
- Set up usage alerts
- Consider upgrading if needed

---

## Performance Optimization

### CDN Configuration

**Cloudflare:**

```
Page Rules:
  *.jpg, *.png, *.webp -> Cache Level: Standard
  /api/* -> Cache Level: Bypass
```

**Images:**

- Use image optimization service (Cloudinary, Imgix)
- Serve WebP format with JPG fallback
- Implement responsive images

### Caching Strategy

**Static Assets:**

- Cache-Control: `public, max-age=31536000, immutable`

**API Responses:**

- Photos list: `public, max-age=300` (5 minutes)
- Photo details: `public, max-age=3600` (1 hour)

**Service Worker (Optional):**

```javascript
// Cache map tiles
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("api.mapbox.com")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

---

## Monitoring Setup

### Sentry Integration

**Install:**

```bash
npm install @sentry/browser
```

**Initialize:**

```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
});
```

**Use in ErrorBoundary:**

```typescript
import * as Sentry from '@sentry/browser';

componentDidCatch(error, errorInfo) {
  Sentry.captureException(error, {
    contexts: { react: errorInfo },
  });
}
```

### Performance Monitoring

**Metrics to Track:**

- Page load time
- Map initialization time
- API response time
- Photo render time
- User interactions

**Tools:**

- Google Analytics 4
- Vercel Analytics
- Custom timing API

**Example:**

```typescript
// Track map load time
const start = performance.now();
// ... map loads
const duration = performance.now() - start;
trackPerformance("map_load", duration);
```

---

## Health Checks

### Endpoint: /api/health

**Create:**

```typescript
// src/pages/api/health.ts
export const GET = () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
```

### Monitoring

**Uptime Monitoring:**

- UptimeRobot (free)
- Pingdom
- StatusCake

**Alert on:**

- 5xx errors
- Response time >3s
- Failed health checks

---

## Rollback Strategy

### Git-based Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout specific version
git checkout v1.0.0
```

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback

```bash
# Supabase
supabase db reset

# Or restore from backup
supabase db dump > backup.sql
```

---

## Post-Deployment Verification

### Smoke Tests

**1. Map Loads:**

```bash
curl https://yourdomain.com/map
# Should return 200 OK
```

**2. API Works:**

```bash
curl https://yourdomain.com/api/photos?limit=1
# Should return JSON with photo data
```

**3. Mapbox Loads:**

- Open map in browser
- Check browser console for errors
- Verify pins appear

### User Flow Testing

**Manual Tests:**

1. Load map → photos appear
2. Click pin → popup shows
3. Click thumbnail → map centers
4. Apply filter → photos update
5. Load more → pagination works
6. Locate me → geolocation works

**Automated Tests:**

```bash
# Run E2E tests
npm run test:e2e

# Or use Playwright
npx playwright test
```

---

## Troubleshooting

### Common Issues

**1. Map tiles not loading**

```
Problem: Blank map or missing tiles
Solution:
- Verify Mapbox token
- Check token URL restrictions
- Verify network requests in DevTools
```

**2. Photos not appearing**

```
Problem: Map loads but no pins
Solution:
- Check /api/photos response in Network tab
- Verify database has approved photos
- Check console for JavaScript errors
```

**3. 500 errors**

```
Problem: Internal server errors
Solution:
- Check server logs
- Verify environment variables
- Check database connection
- Review Sentry errors
```

**4. Slow performance**

```
Problem: Map is laggy
Solution:
- Enable CDN
- Optimize image sizes
- Check bundle size
- Review Lighthouse report
```

---

## Maintenance

### Regular Tasks

**Weekly:**

- Review error logs
- Check performance metrics
- Monitor Mapbox usage
- Verify uptime

**Monthly:**

- Update dependencies
- Rotate API keys (if policy requires)
- Review and optimize slow queries
- Check for security updates

**Quarterly:**

- Performance audit
- Security audit
- User feedback review
- Feature planning

---

## Scaling Considerations

### Database

**Current:** Supabase free tier  
**Upgrade When:**

- > 500 requests/second
- > 50K photos in database
- Query performance degrades

**Optimization:**

- Add database indices
- Implement read replicas
- Use connection pooling

### API

**Current:** Single Astro server  
**Upgrade When:**

- > 1000 concurrent users
- Response time >1s

**Optimization:**

- Add load balancer
- Implement caching layer (Redis)
- Use edge functions

### Map

**Current:** Client-side rendering  
**Upgrade When:**

- > 10K users/day
- Mapbox costs high

**Optimization:**

- Implement tile caching
- Use custom tile server
- Reduce zoom levels

---

## Support

**Documentation:**

- [User Guide](./map-view-user-guide.md)
- [Developer Guide](./map-view-developer-guide.md)
- [Implementation Plan](./map-view-implementation-plan.md)

**Monitoring Dashboards:**

- Sentry: errors.yourdomain.com
- Analytics: analytics.yourdomain.com
- Uptime: status.yourdomain.com

**Contact:**

- DevOps: devops@yourdomain.com
- On-call: oncall@yourdomain.com

---

**Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Deployment Status:** ✅ Ready for Production
