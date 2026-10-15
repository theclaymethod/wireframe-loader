# Use in a React Native app

This repo contains an editable native component, with Skia and SVG renderers. Start with Skia: it is the renderer exercised in the recorded iOS Release simulator verification. Read [PERFORMANCE.md](PERFORMANCE.md) before choosing a density or claiming device performance.

## Copy the library

Copy `src/` into your app as `src/components/wireframe-loader/`. Keep `LICENSE` and `TRANSITIONS-LICENSE.txt` with the copied module. Copy [example/IntegrationCard.tsx](example/IntegrationCard.tsx) as a starting component and change its import from `../src/skia` to `./wireframe-loader/skia` relative to its new location.

The module has no dependency on the portfolio, Artifacture, Vite, React Native Web, or the demo app. A local workspace dependency is also possible through package.json's `.` and `./skia` exports; keep a single React and React Native runtime and configure Metro for your app's workspace layout.

For an Expo app, use its SDK resolver for native versions:

```sh
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets
npm install svg-path-properties
```

The SVG alternative imports from `src/index.ts` and additionally needs `react-native-svg`. Skia use does not require SVG. Match Reanimated 4, Worklets, React Native's New Architecture, and Skia to the consuming app. In bare RN, follow the installed packages' native setup, put `react-native-worklets/plugin` last in Babel plugins, install pods, and rebuild. Installing native libraries requires a development/native build; the Vite preview is separate.

## Connect to real loading

```tsx
<IntegrationCard
  loading={isFetching || !assetsReady}
  data={data}
/>
```

Mount the same component before, during, and after the request. Keep `loading` true until data, fonts, and images are ready. Blueprint dimensions reserve the component's frame before any data exists. The animation builds to a waiting checkpoint while loading; readiness continues the existing sequence through the reveal into the real native views.

`WireframePart` IDs match the skeleton's parts and refine their bounds after native layout. Adapt the blueprint to your component and responsive layout. Keep eventual values in native children, and describe expected content rather than rendering guessed numbers in the skeleton.

Use `wireframePresets.default`: density 0.5, intensity 0.25, contrast 0.5, duration 3600ms. Each prop remains independently adjustable. Per-part `emphasis` and content descriptors control which data regions become stronger. `paused`, system reduced motion, and `onRevealComplete` support screen lifecycle and accessibility. See README.md for the full API.

## Verify in the consuming app

1. Hold a real request pending and confirm construction reaches the waiting state.
2. Resolve it and confirm the reveal continues into the final component without remounting.
3. Retry while building or revealing; stale callbacks must not fire.
4. Exercise the real native button after reveal, app background/foreground, reduced motion, and any list visibility controls.
5. Measure on your target hardware before increasing density or running many loaders at once.

The included native harness is in [native-example/README.md](native-example/README.md). Historical iOS simulator evidence remains there; this extraction did not rerun the simulator. Android and physical-device performance remain unverified.
