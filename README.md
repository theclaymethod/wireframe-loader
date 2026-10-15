# React Native wireframe loader

A component-shaped dotted skeleton that builds while data loads, waits in place, then reveals the actual native component through a descending scan. SVG and Skia renderers share geometry, timing, measurement, accessibility, retry handling and controls.

The scene includes a radial dot-field bloom, fading matrix columns, paired outline traces, moving trace heads, construction guides, corner handles, arriving particles, a tracking reticle and a scan glow. It is an independent implementation inspired by the [transitions.dev UI generation effect](https://github.com/Jakubantalik/transitions.dev/tree/main/skills/transitions-ui-generation). No upstream runtime or generation-log UI is bundled. The native heart-rate example adapts the reference component’s geometry and appearance; its upstream terms are preserved below.

For a runnable iOS app that imports this source directly, see [native-example/README.md](./native-example/README.md).

Start with [INTEGRATION.md](INTEGRATION.md) for source-copy instructions and a minimal typed native card. This separate repository is the canonical implementation; the portfolio gallery retains media and a reference only.

## Add to a native app

This is an editable local module, separate from Artifacture’s web components. Copy `src/` into your React Native project, or add this directory as a local workspace dependency. It is not published to npm.

For Expo, install compatible versions using your SDK’s resolver:

```sh
npx expo install react-native-reanimated react-native-worklets
npm install svg-path-properties
# Choose one renderer, or install both:
npx expo install react-native-svg
npx expo install @shopify/react-native-skia
```

Use React Native’s New Architecture and Reanimated 4. In a bare app, put `react-native-worklets/plugin` last in Babel’s plugins, install iOS pods, and rebuild. Expo’s supported Babel preset configures the plugin. Match Reanimated, Worklets and React Native versions to one another; this preview uses RN 0.87.1, Reanimated 4.7.1, Worklets 0.13.0, SVG 15.15.5 and Skia 2.14.0. The browser build is not a native-device performance check.

```tsx
import { View, Text, Pressable } from 'react-native';
import { WireframeLoader, WireframePart, wireframePresets } from './wireframe-loader';
// For Skia instead:
// import { SkiaWireframeLoader as WireframeLoader,
//   WireframePart, wireframePresets } from './wireframe-loader/skia';

const skeleton = {
  width: 344, height: 160, radius: 20,
  parts: [
    { id: 'title', kind: 'line' as const, x: 24, y: 38, width: 180 },
    { id: 'action', kind: 'rect' as const,
      x: 24, y: 96, width: 296, height: 40, radius: 12 },
  ],
};

<WireframeLoader
  loading={isFetching || !assetsReady}
  skeleton={skeleton}
  {...wireframePresets.default}
  style={{ height: 160 }}
  loadingLabel="Loading workspace"
>
  {data && <View style={{ height: 160, padding: 24, borderRadius: 20,
    backgroundColor: 'white' }}>
    <WireframePart id="title"><Text>{data.title}</Text></WireframePart>
    <WireframePart id="action" style={{ marginTop: 48 }}>
      <Pressable onPress={openWorkspace}><Text>Open workspace</Text></Pressable>
    </WireframePart>
  </View>}
</WireframeLoader>
```

Keep `loading` true until the component’s data, images and fonts are ready. The loader cannot detect an image or font that your app has not loaded. Mount the loader throughout the request; conditionally rendering the loader separately from the final component breaks the continuous reveal.

The blueprint works before content exists. `WireframePart` is optional: native layout measurements refine a matching part when its real view mounts. It measures native views, not a DOM tree or a pixel snapshot. Text uses dotted baselines; optional line `height` (default 16) gives the reticle and field illumination the full text area. Measured lines use their native view bounds; supplied paths can describe custom silhouettes. Give each part a unique ID. Wrap only the parts you want drawn.

## Controls

| Prop | Default | Effect |
| --- | --- | --- |
| `density` | `0.5` | `0.25–2`: field spacing, trace-dot spacing, particle count and secondary guides. |
| `emphasis` | unset | Per-part `{ contrast?: number, color?: string }` overrides keyed by skeleton part ID. Contrast accepts `0–3`; global contrast 0 hides all loader ink. |
| `contrast` | `0.5` | `0–3`: 0 hides the decorative loader, 1 preserves reference ink, 3 strengthens faint details and blends trace/highlight colors toward `fieldColor`. Live updates preserve playback; final content is unaffected. |
| `intensity` | `0.25` | `0–3`: rain/trace speed and particle travel; above `1`, adds orbiting trace particles and curved trajectories. `0` stops ambient movement; the build still draws. |
| `duration` | `3600` | `0–5000ms`: complete build in animation time. Loading builds through 66%, then waits; readiness continues from the current position. At 60fps the remaining reveal takes about 1,224ms at the default. Slow frames extend playback rather than skip stages; duration 0 and reduced motion settle immediately. |
| `paused` | `false` | Freeze build, rain and reveal. Resume from the same build progress. Connect to AppState or list visibility. |
| `reducedMotion` | system | Static skeleton and immediate reveal. Responds to accessibility preference changes. |
| `color`, `fieldColor`, `strongColor` | gray, ink, dark gray | Trace, resting field and active dot/head/handle colors. |
| `surfaceColor` | white | Fill behind corner handles; match the page background. |
| `backgroundColor` | transparent | Reserved native frame background. Usually leave transparent and give the real child its own surface. |
| `loadingLabel` | Loading content | Accessible pending state. Final content is hidden from assistive tech and touch until reveal completion. |
| `onRevealComplete` | — | Called once after a loading cycle finishes. Skipped for an initially ready component. |

`wireframePresets.default` is the preferred starting point: density 0.5, intensity 0.25, contrast 0.5, and duration 3,600ms, with motion enabled. Both renderers and the demo use these defaults.

`wireframePresets.sparse`, `.reference`, and `.overdrive` provide density/intensity/duration combinations. Spread one into either renderer, then override individual values. Reference reproduces the construction vocabulary and timing without invented metadata labels. Overdrive adds motion beyond the reference.

A `false → true` loading change cancels an active reveal. Change the loader’s React `key` to restart while already loading or when switching to a different component identity. Aborted runs cannot call a stale completion callback. The ready state removes the overlay and stops its animation clocks.

## Layout and rendering

Reserve the final component’s frame with `style`. Skeleton coordinates scale to that frame; rebuild the blueprint for responsive reflow and larger text instead of stretching unrelated layouts. Children stay in native views: opposite translations move a clipping window while keeping content stationary. Buttons and text remain native after the overlay is removed.

The scene extends 44 logical points beyond the frame for guides and dot falloff. Leave space around it and avoid clipping ancestors if you want that full construction halo. The content clip remains inside the frame. For dense lists, use sparse settings and pause offscreen items.

Geometry is compiled only on layout/configuration changes, with up to 32 authored parts and roughly 2,400 field points per loader. Field dots use individual UI-thread values so the ripple, rain, probe and moving reticle can change their opacity, radius and ink independently. Sampling and path parsing happen on JS before animation; native frames use Reanimated worklets. SVG uses dotted paths with sampled vector trimming on native (trim masks on web); Skia uses Canvas paths, dash effects and trim values. Skia has its own entry point so choosing SVG does not import Skia.

## Preview and verification

```sh
cd ~/dev/wireframe-loader
npm ci
npm run dev
npm run typecheck
npm run build:preview
```

Open `http://127.0.0.1:5183/`. The demo uses the real native source through React Native Web and CanvasKit, with renderer, density, intensity, contrast, duration, pause, retry and reduced-motion controls. The heart-rate sample mirrors the reference component’s construction density; the workspace sample shows a simpler integration. Its delayed retry is simulated data; the loader itself has no fake request timer.

TypeScript and the browser build pass. The Skia renderer has also been run in a bundled Release iOS app on the iPhone 16 simulator (iOS 18.3): loading/reveal, native button interaction, measured workspace content, retry, Overdrive, and pause/resume were exercised. See [the native verification receipt](./native-example/README.md#ios-verification--october-15-2026) for exact versions and limits. SVG renders but stalls the simulator at reference density, so it is not production performance-verified. Native ambient activity is capped at 20 updates/second. The UI-thread construction clock advances by at most 1/60 second per frame, so slow frames extend the sequence instead of skipping stages. Physical-device frame rate, Android, VoiceOver/TalkBack, and font scaling remain unverified.

## Reference fidelity

At reference density (1), the scene follows the original 15-point grid, 4.8-point trace spacing, two-sided outline, staggered 0.2-phase part traces, inverse-eased particle arrival, moving reticle illumination, text endpoint dots, guide/handle fade windows, and scan reveal. The reference timeline is normalized from its 1.09 endpoint into the loader’s 0–1 clock. The loader holds just before reveal while data is pending. Ambient motion uses a monotonic UI-thread clock and resumes without a loop-reset jump.

Coordinate labels and generation logs are omitted. The native content uses a clipping window and opacity; the web reference’s animated CSS blur is not reproduced. Source inspiration and adapted choreography: [Jakub Antalik / transitions.dev](https://github.com/Jakubantalik/transitions.dev/tree/main/skills/transitions-ui-generation). The upstream terms for the adapted effect are preserved in [TRANSITIONS-LICENSE.txt](./TRANSITIONS-LICENSE.txt).

### Emphasize the UI being built

Both SVG and Skia accept the same `emphasis` map. Give meaningful content stronger ink while the field and construction guides stay at the global contrast:

```tsx
<SkiaWireframeLoader
  loading={loading}
  skeleton={heartSkeleton}
  contrast={0.5}
  emphasis={{
    reading: { contrast: 2, strokeWidth: 2.4, dotSpacing: 4 },
    unit: { contrast: 1.25 },
    pulse: { contrast: 2, color: "#ec4a4a" },
  }}
>
  <HeartRateCard />
</SkiaWireframeLoader>
```

IDs refer to parts in your skeleton blueprint. Omitted values inherit the loader's ink; explicit colors preserve their hue. Overrides affect each part's trace, moving head and end caps, while guides retain the global contrast. They use the same build and reveal phases, and changing emphasis does not restart playback. Global contrast 0 remains a master off switch. Final child colors are unchanged. The heart sample uses abstract numeric drafting strokes and a generic waveform. The loader never receives the actual reading or chart data.

### Describe expected content

Use `kind: "content"` to describe what will occupy an area before the data exists. All dimensions use the skeleton's design coordinates. `WireframePart` measurement can override these bounds.

```tsx
const skeleton: WireframeSkeleton = {
  width: 332, height: 344.5, radius: 24,
  parts: [
    {
      id: "reading", kind: "content",
      x: 107, y: 76, width: 77, height: 44,
      content: { type: "number", digits: 2 },
      emphasis: { contrast: 2, strokeWidth: 2.4, dotSpacing: 4 },
    },
    {
      id: "description", kind: "content",
      x: 24, y: 250, width: 180, height: 48,
      content: { type: "text", lines: 3, lineWidths: [1, 0.85, 0.6] },
    },
    {
      id: "trend", kind: "content",
      x: 16, y: 162, width: 300, height: 50,
      content: { type: "chart", variant: "waveform", samples: 32, amplitude: 0.9, seed: 7 },
      emphasis: { contrast: 2, color: "#ec4a4a" },
    },
  ],
};
```

| Content | Controls | Drawing |
| --- | --- | --- |
| `number` | `digits` (1–12, default 2), `decimals` (0–6, default 0) | Filled rectangular fields of dots per character slot and an optional decimal marker; no literal digits or guessed values. `digits` counts integer slots. `treatment` defaults to `dots`; `rowSpacing` controls vertical dot spacing (2–16, default 4). Optional `outline` and `gesture` treatments remain available. |
| `text` | `lines` (1–8), `lineWidths` (one 0–1 fraction per line) | Text baselines with controllable ragging. Defaults to one full-width line, or the length of `lineWidths`. |
| `chart` | `variant`: `line`, `bars`, or `waveform`; `samples` (3–48); `amplitude` (0–1); `seed` (finite number) | Stable synthetic geometry that suggests data structure. Defaults: line, 16 samples, amplitude 0.7, seed 1. No actual data is required. |
| `image` | The element bounds | A landscape contour and circular image detail. |

Inline `emphasis` belongs to any blueprint part, including existing rectangles, circles, lines and custom SVG paths. Loader-level `emphasis[id]` overrides individual inline fields, which makes theme or screen-specific adjustments possible without rebuilding the blueprint. Each unset field inherits its normal default. `strokeWidth` accepts 0.5–6 design points; `dotSpacing` accepts 2–16 design points independently of the global field density. Parts build in blueprint order; generated strokes for one content element share its build phase and reticle bounds. Custom `kind: "path"` parts remain available for bespoke drawings.

`abstraction` accepts 0–1 (default 0.8). For numbers with `treatment: "gesture"`, it loosens character slots into drawing gestures; for line and waveform charts, values from 0.35 introduce curved fragments and values from 0.7 increase their gaps. Text, bars and image sketches currently retain their geometry. The heart demo uses filled dot boxes for numeric slots and abstraction 1 for its waveform sketch.

Both renderers use the same generated paths, clipping and reveal clock. Content descriptors are layout expectations, not data placeholders: keep eventual values in the children, and use `loading` to trigger the transition into them.

### Performance and native stability

The Skia renderer batches the background field into one animated picture instead of a React/Skia circle and six derived values per dot. The preferred heart blueprint has 420 field dots: the field now uses one derived value instead of 2,520. Per-dot size, color, opacity and the construction sequence are preserved. Construction strokes remain separate to retain their trim, emphasis and reveal behavior.

Canvas size comes from a surrounding React Native View's layout event. This avoids the Skia 2.2.12 `onSize` JSI callback, whose unguarded native view dereference matched three local crash reports. The separate Skia-root readiness gate remains in place, so playback waits for scene registration and layout.

Static geometry is cached with a 256-entry bound. Straight horizontal/vertical paths use two samples; curves use length-dependent sampling up to 193 points. In the heart sample, 22 numeric box rows need 44 sampled points instead of 4,246. The library automatically suspends its frame callback while the app is inactive and after reveal completion. `paused` still supports explicit application control.

See [native verification and limits](PERFORMANCE.md). These changes were checked in a native iOS Release simulator build; physical-device FPS and Android performance remain unmeasured.
