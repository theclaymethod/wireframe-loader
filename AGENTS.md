# Wireframe loader

This repository is the canonical implementation. The portfolio design gallery stores previews and references this repo; do not maintain another implementation there.

Read INTEGRATION.md before adapting this into an app. Prefer the Skia entry point (`src/skia.tsx`) for native use; the SVG path is available but stalls the recorded simulator at reference density. Both renderers share geometry, lifecycle, and controls.

Keep build → loading hold → reveal → native content continuous. Never replace the loader with a separately mounted final component. Keep real values in children; skeleton content descriptors describe expected structure, including dotted numeric boxes, text, charts, and per-part emphasis.

Preferred defaults are density 0.5, intensity 0.25, contrast 0.5, duration 3600ms. Preserve reduced motion, accessibility gating, app inactivity suspension, bounded geometry, and the ready-state clock shutdown.

`src/` is the portable library. `example/IntegrationCard.tsx` is a minimal native integration. `native-example/` is the Expo simulator harness; generated iOS/Android directories and installed dependencies are ignored. Root Vite files are for browser previews only; never add them to a consuming app's runtime.

Run `npm run typecheck` and `npm run build:preview` after changes. Native rendering changes require verification in the consuming native app; browser success does not prove native behavior. Read PERFORMANCE.md and native-example/README.md for historical simulator evidence and limits. Do not imply that a repository move reverified iOS or Android.

No new test files without explicit user approval. Preserve LICENSE, TRANSITIONS-LICENSE.txt, source attribution, and recorded verification limits.
