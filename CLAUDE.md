# Topo-Slice

Web application for visualizing elevation profiles along lines drawn on an interactive map.

## Quick Start

```bash
npm run dev      # Start dev server (proxies elevation API)
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

## Tech Stack

- **Framework**: React 18 + TypeScript (strict mode)
- **Build**: Vite 6
- **Styling**: SCSS with CSS Modules
- **Map**: Leaflet + react-leaflet
- **Charts**: Recharts
- **Elevation API**: OpenTopoData (NED10m dataset)

## Architecture

### Two-Pane Layout

```
TopoSlicer
├── MapPane (drawing interface, ~530 lines)
└── ElevationProfile (Recharts visualization)
```

### Data Flow

1. User draws line on map → `onLineDrawn` callback
2. `useElevationData` hook fetches elevations (coarse sample first)
3. Progressive refinement: 3 iterations adding midpoints
4. ElevationProfile updates reactively as data arrives

### Key Files

- `src/hooks/useElevationData.ts` - Main state hook, API requests, progressive refinement
- `src/components/MapPane/MapPane.tsx` - Drawing logic, two modes, keyboard shortcuts
- `src/utils/api.ts` - OpenTopoData client with CORS handling
- `src/utils/geo.ts` - Haversine, interpolation, distance calculations

## Drawing Modes

| Mode | Interaction |
|------|-------------|
| `drag` | Click and drag to draw single line |
| `points` | Click vertices, double-click to finish |

**Keyboard**: ESC to cancel/clear

**Right-click menu** (points mode): Single point = spot elevation, multiple = finish line

## API Integration

**Dev**: Vite proxies `/api/elevation` to OpenTopoData
**Prod**: Uses `corsproxy.io` for CORS

Rate-limiting strategy: Starts with 15 samples, adds midpoints over 3 refinement iterations.

## Code Conventions

- Barrel exports (`index.ts` in each component directory)
- Component-scoped SCSS modules
- AbortController for request cancellation
- Dark theme with SCSS design tokens

## Testing

No test framework configured. Candidates for coverage:
- Geographic calculations (`geo.ts`)
- API error handling
- Drawing state machine

## Deployment

GitHub Pages via GitHub Actions on push to `main`. Base path: `/topo-slicer/`

## Notes

- MapPane is large (~530 lines) - candidate for refactoring
- No ESLint/Prettier configured
- Node 20 for CI/CD
