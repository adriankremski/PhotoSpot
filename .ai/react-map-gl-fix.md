# React-Map-GL Import Error Fix

## Problem

When building the project, Vite was throwing an error:

```
Failed to resolve entry for package "react-map-gl". The package may have incorrect main/module/exports specified in its package.json: Missing "." specifier in "react-map-gl" package
```

## Root Cause

`react-map-gl` version 8.x changed its package structure and **no longer exports a default entry point** (the "." export). Instead, it provides specific exports like:

- `react-map-gl/mapbox` - For Mapbox GL implementation
- `react-map-gl/dist/mapbox/mapbox.css` - For styles

The package.json only has:

```json
"exports": {
  "./mapbox": { ... },
  // No "." export!
}
```

## Solution

### 1. Update All Imports

Changed all imports from:

```typescript
import { Map, ... } from 'react-map-gl';
```

To:

```typescript
import { Map, ... } from 'react-map-gl/mapbox';
```

**Files updated:**

- `src/components/map/MapGL.tsx`
- `src/components/map/PinClusterLayer.tsx`
- `src/components/map/PhotoPopup.tsx`

### 2. Update Vite/Astro Configuration

Added SSR configuration to `astro.config.mjs`:

```javascript
vite: {
  plugins: [tailwindcss()],
  ssr: {
    noExternal: ['react-map-gl', 'mapbox-gl'],
  },
}
```

This tells Vite to bundle these packages instead of treating them as external dependencies during SSR.

## Result

✅ Build succeeds  
✅ No linter errors  
✅ All imports resolved correctly  
✅ Mapbox GL and react-map-gl bundle successfully (~1.68 MB for mapbox-gl chunk)

## Related Documentation

- [react-map-gl v8 Migration Guide](https://visgl.github.io/react-map-gl/docs/upgrade-guide)
- [Package Exports](https://nodejs.org/api/packages.html#package-entry-points)

## Build Output

The successful build shows:

```
dist/client/_astro/MapSection.Ba33iSIn.js          50.15 kB │ gzip:  15.67 kB
dist/client/_astro/mapbox-gl.CkN0RmgW.js        1,679.41 kB │ gzip: 464.39 kB
```

✅ All map components compile and bundle successfully!
