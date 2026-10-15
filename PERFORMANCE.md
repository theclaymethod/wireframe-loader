# Native performance and stability verification

Verified October 15, 2026 in the Expo example's Release build on iPhone 16 / iOS 18.3 Simulator. Runtime: React Native 0.81.5, Hermes, New Architecture, Reanimated 4.1.7, Worklets 0.5.1, Skia 2.2.12. Build log: `/tmp/wireframe-native-release-build-21.log`.

## Crash evidence and change

Three pre-change application reports share `EXC_BAD_ACCESS` at `RNSkView::getScaledWidth`, called by `RNSkJsiViewApi::setJsiProperty` for `onSize`. The installed Skia C++ source dereferences `info->view` in this branch without the null check present in its ordinary property branch. This matches a canvas teardown race. The loader no longer passes `Canvas.onSize`; a surrounding native View reports layout instead, and the existing separate-root readiness gate still holds the animation until the drawing scene is registered.

A sprite-based batching prototype failed native validation and was replaced before the final build. The final renderer records a field picture on the UI runtime and does not use that sprite path.

## Workload changes

- Preferred heart field: 420 circles × 6 derived values becomes 1 field picture × 1 derived value. This is a subscription count, not a frame-rate benchmark.
- The reticle is calculated once per field update instead of independently for every background dot.
- Preferred numeric dot boxes: 22 horizontal paths × 193 points becomes 22 paths × 2 points (4,246 → 44 points).
- Parsed geometry is reused across retries with a 256-entry cache limit. Curves retain up to 193 samples; only straight horizontal/vertical strokes use two.
- Frame callbacks stop while the app is inactive, explicitly paused, or fully revealed.

## Direct checks on the final build

The same native process (PID 45536) remained alive through:

- 12 consecutive heart/workspace sample switches, mounting and unmounting canvases.
- 14 complete retry → construction → reveal → canvas teardown cycles: 4 with preferred settings and 10 with Overdrive (density 2, intensity 3).
- Backgrounding an active loader to the home screen and resuming into the same process.
- A reduced-motion reveal and a working native Heart rate details button afterward.

No new application crash reports appeared during those checks. The latest reports remained the two failed sprite-prototype launches, preceding the final build. The pre-existing three size-callback crash reports also remained unchanged. Native logs showed no unhandled JS exceptions during the final checks.

TypeScript checking and the Vite production preview build passed. Shared geometry was checked directly for positive finite lengths, deterministic generation, and straight-path sample reduction. No new test files were added.

## Limits

These are functional and repeated-lifecycle checks in an iOS Release simulator, not proof of a crash-free app or a physical-device frame-rate claim. Android, older supported phones, Instruments profiling, and extended memory-soak testing remain unverified. RSS was observed during the run but does not establish a memory-leak diagnosis. Prefer Skia for ornate scenes; the SVG fallback still has per-dot animated nodes.
