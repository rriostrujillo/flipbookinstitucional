# FlipBook - Issuu-like PDF Viewer

## Project Overview

**Project Name:** FlipBook  
**Type:** Embeddable Web Application  
**Core Functionality:** A lightweight, embeddable PDF viewer that renders PDFs as interactive flipbooks with realistic page-turning animations, similar to Issuu.  
**Target Users:** Website owners who want to display PDFs (magazines, catalogs, brochures, books) as engaging flipbooks on their websites.

---

## UI/UX Specification

### Layout Structure

#### Main Components
1. **Header Bar** (optional, hidden in embed mode)
   - Title/document name
   - Page counter (e.g., "Page 3 of 12")

2. **FlipBook Container**
   - Central area displaying the PDF pages
   - Responsive sizing based on container
   - Touch/swipe support for mobile

3. **Control Bar** (bottom)
   - Navigation arrows (previous/next)
   - Page slider/thumbnail
   - Zoom controls (+/-)
   - Fullscreen toggle
   - Download button (optional)

4. **Sidebar** (optional)
   - Page thumbnails for quick navigation

#### Responsive Breakpoints
- **Mobile:** < 768px - Single column, touch swipe enabled
- **Tablet:** 768px - 1024px - Adaptive layout
- **Desktop:** > 1024px - Full experience with controls

### Visual Design

#### Color Palette
- **Primary:** `#1a1a2e` (Deep navy)
- **Secondary:** `#16213e` (Dark blue)
- **Accent:** `#e94560` (Coral red)
- **Background:** `#f5f5f5` (Light gray)
- **Text Primary:** `#333333`
- **Text Secondary:** `#666666`
- **Surface:** `#ffffff` (White for pages)

#### Typography
- **Font Family:** "Inter", -apple-system, BlinkMacSystemFont, sans-serif
- **Headings:** 600 weight, 1.2rem - 1.5rem
- **Body:** 400 weight, 0.875rem - 1rem
- **Controls:** 500 weight, 0.75rem - 0.875rem

#### Spacing System
- Base unit: 8px
- Margins: 8px, 16px, 24px, 32px
- Padding: 8px, 12px, 16px, 24px

#### Visual Effects
- **Page turn:** Smooth flip animation (300ms ease-out)
- **Shadows:** `0 4px 20px rgba(0,0,0,0.15)` for pages
- **Hover states:** Scale 1.05 with shadow enhancement
- **Transitions:** All interactive elements 200ms ease

### Components

#### Navigation Controls
- **Previous/Next Buttons:** Circular, 40px, icon-based
- **Page Slider:** Custom styled range input
- **Zoom Buttons:** +/- with visual feedback
- **Fullscreen:** Expand/collapse icon

#### Page Display
- **Single Page Mode:** Centered, responsive width
- **Double Page Mode:** For landscape, book-like spread
- **Loading State:** Skeleton shimmer effect

#### Embed Controls
- Close button (for lightbox mode)
- Share button
- Print button (optional)

---

## Functionality Specification

### Core Features

#### 1. PDF Rendering
- Load PDF from URL or local file
- Support for multi-page PDFs (up to 500 pages)
- Render pages as canvas elements
- High-quality rendering with DPI support

#### 2. Page Flip Animation
- Realistic page-turn effect using StPageFlip
- Touch/swipe gestures for mobile
- Click and drag to flip
- Keyboard navigation (arrow keys)

#### 3. Embed System
- **iframe embedding:** `<iframe src="https://tu-servidor/flipbook?pdf=URL"></iframe>`
- **Query Parameters:**
  - `pdf` - URL-encoded PDF file URL
  - `page` - Initial page number
  - `theme` - Theme color (light/dark)
  - `controls` - Show/hide controls (1/0)
  - `fullscreen` - Enable fullscreen (1/0)

#### 4. Navigation
- Previous/Next page buttons
- Page number input
- Thumbnail sidebar navigation
- Keyboard shortcuts (←, →, Home, End)

#### 5. Zoom
- Zoom in/out buttons (50% - 200%)
- Pinch-to-zoom on mobile
- Double-tap to zoom

#### 6. Responsive Behavior
- Adapts to container size
- Touch gestures on mobile
- Landscape/portrait orientation support

### User Interactions

| Action | Desktop | Mobile |
|--------|---------|--------|
| Next page | Click → button, → key, click right edge | Swipe left |
| Previous page | Click ← button, ← key, click left edge | Swipe right |
| Zoom | Click +/- buttons, scroll wheel | Pinch gesture |
| Fullscreen | Click fullscreen button | Tap fullscreen icon |
| Page jump | Click thumbnail, type page number | Tap thumbnail |

### Data Handling

- **PDF Loading:** Fetch via URL with CORS support
- **Page Caching:** Lazy load pages (current ± 2 pages)
- **State:** URL-based state for sharing (page number)
- **No server storage** - Client-side only

### Edge Cases

- Invalid/corrupted PDF: Show error message
- CORS blocked PDF: Display proxy option
- Single page PDF: Disable navigation
- Very large PDF (>50MB): Show loading progress
- No JavaScript: Display fallback link to PDF

---

## Technical Stack

- **PDF Rendering:** PDF.js (Mozilla)
- **Page Flip:** StPageFlip
- **Build Tool:** Vite (for development)
- **Language:** Vanilla JavaScript (ES6+)
- **Styling:** CSS3 with CSS Variables

---

## Acceptance Criteria

### Visual Checkpoints
- [ ] PDF renders clearly at all zoom levels
- [ ] Page flip animation is smooth (60fps)
- [ ] Controls are visible and functional
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Loading states are displayed during PDF fetch

### Functional Checkpoints
- [ ] Can load PDF from URL parameter
- [ ] Navigation (next/prev) works correctly
- [ ] Zoom in/out functions properly
- [ ] Touch/swipe works on mobile
- [ ] Embed via iframe works on external site
- [ ] Page state is shareable via URL

### Performance
- [ ] Initial load < 3 seconds for 10-page PDF
- [ ] Page flip animation < 300ms
- [ ] Memory usage < 200MB for 50-page PDF

---

## File Structure

```
issuu/
├── SPEC.md
├── package.json
├── index.html          # Demo page (parent)
├── src/
│   ├── main.js         # Entry point
│   ├── pdf-loader.js   # PDF.js integration
│   ├── flip-viewer.js  # StPageFlip integration
│   ├── controls.js     # Navigation controls
│   ├── embed.js        # Embed/iframe handling
│   └── styles/
│       └── main.css    # All styles
├── public/
│   └── sample.pdf      # Demo PDF
└── dist/               # Built files
```
