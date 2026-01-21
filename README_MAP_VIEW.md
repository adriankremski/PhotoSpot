# PhotoSpot Map View

> Interactive map for discovering photo locations worldwide

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS-000000)

---

## 🗺️ Overview

The Map View is the primary feature of PhotoSpot, allowing users to discover photo locations through an interactive Mapbox-powered map. It features photo pins, advanced filtering, thumbnail galleries, and seamless map-thumbnail synchronization.

**Live Demo:** [https://photospot.com/map](https://photospot.com/map) _(coming soon)_

---

## ✨ Features

### 🎯 Core Features

- **Interactive Mapbox Map** - Pan, zoom, and explore photo locations
- **Photo Pins** - Gold pins for photographers, blue for enthusiasts
- **Smart Clustering** - Automatically clusters pins when >50 photos visible
- **Photo Popups** - Click pins to preview photos with details
- **Advanced Filtering** - Filter by category, season, time of day, photographer-only
- **Bidirectional Sync** - Click pins to scroll thumbnails, click thumbnails to center map

### 📱 Responsive Design

- **Desktop:** Horizontal thumbnail strip with smooth scrolling
- **Mobile:** Swipeable carousel with draggable bottom sheet
- **Touch-Optimized:** Native gestures for mobile interactions

### ♿ Accessibility

- **Screen Reader Support** - Full ARIA implementation
- **Keyboard Navigation** - Tab through controls, arrow keys for thumbnails
- **Live Announcements** - Photo counts and filter changes announced
- **High Contrast** - Supports system dark mode

### ⚡ Performance

- **Optimized Rendering** - React.memo for expensive components
- **Debounced API Calls** - 500ms delay for viewport changes
- **Lazy Loading** - Images load on demand
- **Request Cancellation** - AbortController for stale requests

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+
npm 9+
Mapbox account (free tier)
Supabase project
```

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/photospot.git
cd photospot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Mapbox token and Supabase credentials

# Run development server
npm run dev
```

Navigate to `http://localhost:3000/map`

---

## 📦 Tech Stack

| Technology       | Version | Purpose        |
| ---------------- | ------- | -------------- |
| **Astro**        | 5.13.7  | SSR framework  |
| **React**        | 19.1.1  | UI components  |
| **TypeScript**   | 5.x     | Type safety    |
| **Mapbox GL JS** | 3.17.0  | Map rendering  |
| **react-map-gl** | 8.1.0   | React bindings |
| **Tailwind CSS** | 4.1.13  | Styling        |
| **Shadcn/ui**    | Latest  | UI components  |
| **Vitest**       | 4.0.16  | Testing        |

---

## 🏗️ Architecture

```
src/components/map/
├── MapSection.tsx          # Container component
├── MapGL.tsx               # Mapbox wrapper
├── PinClusterLayer.tsx     # Photo pins with clustering
├── PhotoPopup.tsx          # Pin popup overlay
├── FilterPanel.tsx         # Filter controls
├── MapControls.tsx         # Map control buttons
├── ThumbnailStrip.tsx      # Desktop gallery
├── BottomSheetCarousel.tsx # Mobile gallery
├── useMapPhotos.ts         # Data management hook
├── useMapSync.ts           # Sync hook
└── map.css                 # Custom styles
```

**API Endpoint:** `GET /api/photos` - Returns photos with pagination

---

## 📖 Documentation

- **[User Guide](.ai/map-view-user-guide.md)** - How to use the map view
- **[Developer Guide](.ai/map-view-developer-guide.md)** - Technical documentation
- **[Deployment Guide](.ai/map-view-deployment-guide.md)** - Production deployment
- **[Implementation Plan](.ai/map-view-implementation-plan.md)** - Full specification

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test
npm run test -- useMapPhotos.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# UI
npm run test:ui
```

**Test Coverage:**

- ✅ Unit tests for custom hooks
- ✅ Component tests for UI
- ⏳ E2E tests (planned)

---

## 🎨 Customization

### Change Default Viewport

```typescript
// src/lib/utils/mapHelpers.ts
export const DEFAULT_VIEWPORT = {
  latitude: 40.7128, // New York
  longitude: -74.006,
  zoom: 10,
};
```

### Customize Pin Colors

```typescript
// src/components/map/PinClusterLayer.tsx
fill={isPhotographer ? '#your-color' : '#another-color'}
```

### Adjust Debounce Delay

```typescript
// src/components/map/useMapPhotos.ts
debounceTimeoutRef.current = setTimeout(() => {
  // ...
}, 1000); // Change from 500ms to 1000ms
```

---

## 🐛 Troubleshooting

### Map doesn't load

**Problem:** Blank screen or error  
**Solution:**

```bash
# Verify Mapbox token
echo $PUBLIC_MAPBOX_TOKEN

# Check console for errors (F12)
# Ensure token has correct URL restrictions
```

### Photos not appearing

**Problem:** Map loads but no pins  
**Solution:**

```bash
# Test API endpoint
curl http://localhost:3000/api/photos?limit=10

# Check database has approved photos
# Verify Supabase connection
```

### Build errors

**Problem:** `react-map-gl` import error  
**Solution:**

```typescript
// Use /mapbox import path
import { Map } from "react-map-gl/mapbox";
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment Variables:**

- `PUBLIC_MAPBOX_TOKEN`
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See [Deployment Guide](.ai/map-view-deployment-guide.md) for detailed instructions.

---

## 📊 Performance

### Bundle Sizes

```
MapSection: 51.20 kB (gzipped: 16.08 kB)
Mapbox GL: 1,679.41 kB (gzipped: 464.39 kB)
Build time: ~14 seconds
```

### Lighthouse Scores

- **Performance:** 90+
- **Accessibility:** 95+
- **Best Practices:** 100
- **SEO:** 95+

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Development Workflow:**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**Code Style:**

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- 100% test coverage for new features

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- **Mapbox** - Map rendering engine
- **Supabase** - Backend infrastructure
- **Shadcn/ui** - UI component library
- **Vercel** - Hosting platform

---

## 📞 Support

- **Documentation:** [User Guide](.ai/map-view-user-guide.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/photospot/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/photospot/discussions)
- **Email:** support@photospot.com

---

## 🗺️ Roadmap

- [x] Interactive map with Mapbox
- [x] Photo pins with clustering
- [x] Advanced filtering
- [x] Desktop thumbnail strip
- [x] Mobile carousel
- [x] Accessibility support
- [ ] Location search
- [ ] Favorite locations
- [ ] Custom map styles
- [ ] Offline mode
- [ ] Share locations
- [ ] Download GPX tracks

---

**Built with ❤️ by the PhotoSpot Team**

**Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Status:** ✅ Production Ready
