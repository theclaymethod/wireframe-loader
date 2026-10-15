# Native example

This app imports `../example/App.tsx` and the loader's actual `../src` files. It renders native React Native views, react-native-svg, and React Native Skia. It does not use a WebView or the browser preview.

```sh
cd ~/dev/wireframe-loader/native-example
npm ci
npm run ios:release -- --device "iPhone 16"
```

The first run generates the iOS project, installs CocoaPods dependencies, builds a Release app, and installs it in the selected simulator. Xcode and CocoaPods are required. The generated `ios/` directory is ignored; the Expo config, dependency lockfile, and Metro/Babel configuration are checked in.

The app uses Expo SDK 54, React Native 0.81.5, Hermes, and the New Architecture. Its dependency versions are resolved by Expo's SDK installer. Metro resolves shared source against this app's native dependencies so the browser preview's newer dependencies cannot create a second React or React Native instance.

The preferred defaults are density 0.5, intensity 0.25, contrast 0.5, and duration 3,600ms. They come from `wireframePresets.default`, shared by both library renderers and the demo.

Use **Data ready** to release the indefinitely held skeleton. **Load again** simulates a new request. Scroll down for the renderer, preset, density, intensity, contrast, duration, pause, and reduced-motion controls. Select **Workspace** to exercise native `WireframePart` layout measurement as content mounts.

## iOS verification — October 15, 2026

Built and ran an actual Release `.app` on the iPhone 16 simulator, iOS 18.3, using Xcode 16.2. Stack: Expo 54.0.37, React 19.1.0, React Native 0.81.5, Hermes, New Architecture, Reanimated 4.1.7, Worklets 0.5.1, react-native-svg 15.12.1, Skia 2.2.12. The app contains its JavaScript bundle and runs without Metro.

Skia passed the held dotted skeleton → data-ready reveal → native component flow. The heart-card details button produced “Heart rate details opened”; the measured workspace button produced “Workspace opened”. Retry, the Overdrive preset (density 2, intensity 3), pause/resume, reduced-motion reveal, and restarting the same component were exercised through the native UI. Native ambient activity is capped at 20 updates/second. Construction and reveal use a UI-thread frame clock capped at 1/60 animation second per frame, with a renderer-ready gate before playback. Skia waits for both native canvas sizing and the drawing root’s animation subscriptions to mount. Slow frames extend playback instead of consuming unseen stages; `duration` is animation time rather than a wall-clock deadline. This is a functional verification, not a measured frame-rate guarantee.

Native testing exposed and fixed missing subscriptions through nested worklets, expensive SVG trim masks (replaced with vector trimming on native), an SVG overlay in the heart-card example intercepting touch input, and a same-component restart race from reading progress immediately after a native write. Completed content transforms settle to explicit native props.

A follow-up recording exposed phases passing before the Skia drawing root had mounted, and wall-clock timing jumping ahead during slow frames. After gating the clock on canvas size and the drawing root’s worklet registration, and bounding each progress step, the Release simulator recording was inspected across opening dot bloom, partial outline, interior construction, scan reveal and interactive content. Both cold mount and the 1,800ms simulated-data retry were recorded. Pause before a request, resume after data arrival, and reduced-motion retry were also rechecked. This verifies the observed sequence on this simulator; it does not certify physical-device frame pacing.

Contrast was checked at 0, 1, 2 and 3 in the native Skia Release app. Live changes update the paused scene; 0 hides decorative ink, and resuming still reveals the unaffected native component. The SVG browser preview was checked at 0, 1, 2 and 3 as well.

**SVG is not performance-verified:** it renders the decorative scene, but reference-density ambient animation caused severe simulator UI stalls. Use Skia for the ornate native effect; SVG needs batching/optimization before production use at this density. The browser default remains SVG; the native example defaults to Skia.

The build succeeds with dependency linker/deprecation warnings, including Skia binaries targeting iOS 16 while Expo’s generated default deployment target is 15.1. Verification ran on iOS 18.3; this does not certify older OS versions. Android, physical-device performance, VoiceOver/TalkBack, and dynamic font sizes remain unverified.
