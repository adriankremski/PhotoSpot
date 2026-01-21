# Map View - User Guide

## Overview

The Map View is the primary interface for discovering photo locations on PhotoSpot. It combines an interactive Mapbox-powered map with photo pins, filters, and thumbnail galleries to help you find the perfect photo spots.

---

## Accessing the Map

**URL:** `/map`  
**Auth Required:** No (public view with additional features for authenticated users)

---

## Features

### 📍 Interactive Map

**Pan and Zoom:**

- Click and drag to pan the map
- Scroll wheel to zoom in/out
- Pinch to zoom on mobile
- Double-click to zoom in

**Map Controls:**

- **Locate Me:** Centers the map on your current location (requires location permission)
- **Reset View:** Returns to the default view (Europe)
- **Navigation:** Zoom +/-, Compass, 3D tilt controls (top-right)

### 📸 Photo Pins

**Pin Colors:**

- **Gold pins** 🟡 - Photos uploaded by professional photographers
- **Blue pins** 🔵 - Photos uploaded by enthusiasts

**Pin Clustering:**

- When >50 photos are visible, pins automatically cluster
- Click a cluster to zoom in and see individual pins
- Cluster size indicates number of photos

**Pin Interaction:**

- **Click a pin** to see a popup with photo preview
- Popup shows: thumbnail, title, author, category, favorites
- Click **"View Details"** to go to the photo page

### 🔍 Filters

**Location:** Top-left floating panel

**Filter Options:**

1. **Category** - Choose from 12 categories (landscape, portrait, street, etc.)
2. **Season** - Filter by spring, summer, autumn, winter
3. **Time of Day** - Filter by golden hour, morning, midday, etc.
4. **Photographers Only** - Toggle to show only professional photographer uploads

**How to Use:**

1. Click the filter panel to expand
2. Select your desired filters
3. Click **"Apply Filters"** to refresh results
4. Click **"Reset" (X)** to clear all filters

**Active Filters:**

- Badge shows count of active filters
- Collapse/expand panel with chevron icon

### 🖼️ Photo Galleries

#### Desktop (Large Screens)

**Horizontal Thumbnail Strip** at the bottom:

- Scroll horizontally to browse photos
- Click a thumbnail to center the map on that pin
- Selected photo has a colored ring
- Use **Arrow Left/Right** keys to navigate

#### Mobile (Small Screens)

**Bottom Sheet Carousel:**

- Swipe left/right to browse photos
- Drag handle to expand/collapse sheet
- Tap a photo card to center the map
- Pagination dots show your position

**Load More:**

- Button appears at the end when more photos available
- Loads next 200 photos
- Keeps existing photos visible

### 📤 Upload Button (Photographers Only)

**Location:** Bottom-right floating button (camera icon)

**Requirements:**

- Must be authenticated
- Must have photographer role

**Action:**

- Click to navigate to upload page
- Upload your photos to share locations with the community

---

## Keyboard Shortcuts

| Key              | Action                        |
| ---------------- | ----------------------------- |
| Arrow Left/Right | Navigate thumbnails (desktop) |
| Tab              | Move focus through controls   |
| Enter/Space      | Activate focused button       |
| Escape           | Close popup (planned)         |

---

## Responsive Design

### Desktop (≥1024px)

- Full-width map with floating filter panel
- Horizontal thumbnail strip at bottom
- Map controls on the right
- Upload button on bottom-right

### Mobile (<1024px)

- Full-screen map
- Bottom sheet carousel
- Filter panel slides in from top
- Touch-optimized interactions

---

## Performance Tips

**For Best Experience:**

1. **Zoom In:** Load fewer photos for faster performance
2. **Use Filters:** Narrow down results to specific categories
3. **Clear Browser Cache:** If experiencing slow loading
4. **Stable Internet:** Required for map tiles and photos

**Loading Times:**

- Initial load: 1-3 seconds (depends on photo count)
- Filter application: ~500ms
- Viewport change: Debounced 500ms to reduce API calls

---

## Accessibility Features

### Screen Reader Support

- All interactive elements have ARIA labels
- Live regions announce photo counts and filter changes
- Keyboard navigation fully supported

### Keyboard Navigation

- Tab through all controls
- Arrow keys navigate thumbnails
- Enter/Space activate buttons
- Visual focus indicators

### High Contrast

- Supports system dark mode
- Clear visual focus indicators
- Color-blind friendly pin colors

---

## Troubleshooting

### Map Doesn't Load

**Problem:** Map shows error or blank screen  
**Solution:**

1. Check internet connection
2. Refresh the page
3. Clear browser cache
4. Try different browser

### No Photos Showing

**Problem:** Map loads but no pins appear  
**Solution:**

1. Check if filters are too restrictive - try resetting
2. Pan to a different area
3. Zoom out to see more region
4. Check console for API errors

### Location Permission Denied

**Problem:** "Locate Me" button doesn't work  
**Solution:**

1. Allow location permission in browser settings
2. Reload page after granting permission
3. Or manually pan to your location

### Slow Performance

**Problem:** Map is laggy or slow  
**Solution:**

1. Zoom in to reduce photo count
2. Apply filters to limit results
3. Close other browser tabs
4. Use a modern browser (Chrome, Firefox, Safari, Edge)

### Pins Not Clickable

**Problem:** Clicking pins doesn't show popup  
**Solution:**

1. Refresh the page
2. Check if popup is hidden behind thumbnails (scroll)
3. Try clicking cluster first, then individual pin

---

## Privacy & Security

### Location Data

- Photos show **public locations** only (may be blurred)
- Exact locations protected for photographer privacy
- No location tracking without your consent

### Uploaded Content

- Only approved photos appear on map
- Inappropriate content can be reported
- Photographers control location blur settings

---

## Tips for Best Results

### Finding Photos

1. **Start Broad:** Zoom out to see popular areas
2. **Use Filters:** Narrow by category and season
3. **Explore Clusters:** Click clusters in popular cities
4. **Golden Hour:** Filter by time of day for best lighting spots

### Discovering New Spots

1. **Pan Around:** Explore less dense areas for hidden gems
2. **Check Different Seasons:** Same location, different season
3. **Professional Tips:** Toggle "Photographers Only" for pro spots
4. **Category Specific:** Use category filter for your photography style

### Mobile Usage

1. **Pinch to Zoom:** Natural touch gestures
2. **Swipe Gallery:** Browse photos quickly
3. **Expand Sheet:** Drag up for larger previews
4. **Portrait Mode:** Best for detailed viewing

---

## FAQ

**Q: How many photos can I see at once?**  
A: Up to 200 photos per viewport. Use "Load More" for additional results.

**Q: Can I save favorite locations?**  
A: Photo favoriting is planned for a future update.

**Q: How often are new photos added?**  
A: Photos are added daily by photographers and appear after approval.

**Q: Can I filter by country or city?**  
A: Currently, filtering is by panning the map. Location search is planned.

**Q: Why are some locations blurred?**  
A: Photographers can blur locations to protect sensitive or private spots.

**Q: How do I become a photographer?**  
A: Select "Photographer" role during registration. Your photos will show with gold pins.

---

## Support

**Issues or Questions?**

- Check console for error messages (F12 in browser)
- Report bugs through feedback form
- Contact: support@photospot.com

**Feature Requests:**

- Submit via feedback form
- Vote on planned features
- Join our community forum

---

## Updates

**Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Changelog:** See project repository

---

**Happy Photo Hunting! 📸✨**
