import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  useFrameCallback,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import {
  compileWireframe,
  type MeasuredBox,
  type WireframePath,
  type WireframeEmphasis,
  type WireframeSkeleton,
} from "./geometry";
import { easeOut, windowProgress } from "./motion";
import { wireframePresets } from "./presets";

export interface WireframeLoaderProps {
  loading: boolean;
  skeleton: WireframeSkeleton;
  children: ReactNode;
  /** Full build in animation milliseconds. Slow frames extend playback to preserve each stage. */
  duration?: number;
  /** 0.25–2; 1 matches the reference field and construction detail. */
  density?: number;
  /** 0–3; scales rain speed, particle travel and motion energy. */
  intensity?: number;
  /** 0–3; 0 hides decoration, 1 preserves reference ink, 3 gives strongest ink. */
  contrast?: number;
  /** Per-part ink overrides keyed by skeleton part ID. */
  emphasis?: WireframeEmphasis;
  surfaceColor?: string;
  /** Freezes both the waiting activity and reveal; use while backgrounded. */
  paused?: boolean;
  reducedMotion?: boolean;
  color?: string;
  fieldColor?: string;
  strongColor?: string;
  backgroundColor?: string;
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
  onRevealComplete?: () => void;
}
export interface WireframeCanvasProps {
  skeleton: WireframeSkeleton;
  paths: WireframePath[];
  density: number;
  intensity: number;
  contrast: number;
  surfaceColor: string;
  frame: { width: number; height: number };
  canvasReady: SharedValue<boolean>;
  canvasSize: SharedValue<{ width: number; height: number }>;
  progress: SharedValue<number>;
  reveal: SharedValue<number>;
  loop: SharedValue<number>;
  color: string;
  fieldColor: string;
  strongColor: string;
  reduced: boolean;
}
interface MeasurementContext {
  root: RefObject<ComponentRef<typeof View> | null>;
  scaleX: number;
  scaleY: number;
  register: (id: string, box: MeasuredBox | null) => void;
}
const Measurement = createContext<MeasurementContext | null>(null);

/** Optional: measure a named native view into the matching skeleton part. */
export function WireframePart({
  id,
  children,
  onLayout,
  ...props
}: ViewProps & { id: string }) {
  const context = useContext(Measurement);
  const view = useRef<ComponentRef<typeof View>>(null);
  const measure = useCallback(() => {
    const root = context?.root.current;
    if (!root || !context || !view.current) return;
    view.current.measureLayout(
      root,
      (x, y, width, height) => {
        if (
          view.current &&
          context.root.current === root &&
          width > 0 &&
          height > 0
        )
          context.register(id, {
            x: x / context.scaleX,
            y: y / context.scaleY,
            width: width / context.scaleX,
            height: height / context.scaleY,
          });
      },
      () => {
        /* Explicit skeleton geometry remains the fallback. */
      },
    );
  }, [context, id]);
  useLayoutEffect(measure, [measure, children]);
  useEffect(() => () => context?.register(id, null), [context?.register, id]);
  return (
    <View
      {...props}
      ref={view}
      collapsable={false}
      onLayout={(event) => {
        onLayout?.(event);
        measure();
      }}
    >
      {children}
    </View>
  );
}

export function LoaderCore({
  CanvasRenderer,
  loading,
  skeleton,
  children,
  duration = wireframePresets.default.duration,
  density = wireframePresets.default.density,
  intensity = wireframePresets.default.intensity,
  contrast = wireframePresets.default.contrast,
  emphasis,
  surfaceColor = "#ffffff",
  paused = false,
  reducedMotion,
  color = "#9a9a9a",
  fieldColor = "#0d0d0d",
  strongColor = "#6c6c6c",
  backgroundColor = "transparent",
  loadingLabel = "Loading content",
  style,
  onRevealComplete,
}: WireframeLoaderProps & {
  CanvasRenderer: ComponentType<WireframeCanvasProps>;
}) {
  if (!Number.isFinite(duration) || duration < 0 || duration > 5000)
    throw new Error("Reveal duration must be between 0 and 5,000ms.");
  if (!Number.isFinite(density) || density < 0.25 || density > 2)
    throw new Error("Density must be between 0.25 and 2.");
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 3)
    throw new Error("Intensity must be between 0 and 3.");
  if (!Number.isFinite(contrast) || contrast < 0 || contrast > 3)
    throw new Error("Contrast must be between 0 and 3.");
  const root = useRef<ComponentRef<typeof View>>(null);
  const [frame, setFrame] = useState({
    width: skeleton.width,
    height: skeleton.height,
  });
  const [measurements, setMeasurements] = useState<
    ReadonlyMap<string, MeasuredBox>
  >(() => new Map());
  const register = useCallback(
    (id: string, box: MeasuredBox | null) =>
      setMeasurements((current) => {
        const old = current.get(id);
        if (!box && !old) return current;
        if (
          box &&
          old &&
          ["x", "y", "width", "height"].every(
            (key) =>
              Math.abs(
                box[key as keyof MeasuredBox] - old[key as keyof MeasuredBox],
              ) < 0.25,
          )
        )
          return current;
        const next = new Map(current);
        if (box) next.set(id, box);
        else next.delete(id);
        return next;
      }),
    [],
  );
  const paths = useMemo(
    () => compileWireframe(skeleton, measurements, emphasis),
    [skeleton, measurements, emphasis],
  );
  const systemReduced = useReducedMotion();
  const [preference, setPreference] = useState(systemReduced);
  const reduced = reducedMotion ?? preference;
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setPreference,
    );
    return () => subscription.remove();
  }, []);
  const [appActive, setAppActive] = useState(AppState.currentState === "active" || Platform.OS === "web");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => subscription.remove();
  }, []);
  const canvasReady = useSharedValue(false);
  const canvasSize = useSharedValue({ width: 0, height: 0 });
  const progress = useSharedValue(loading ? 0 : 1),
    loop = useSharedValue(0);
  const [revealed, setRevealed] = useState(!loading);
  const run = useRef(0),
    mounted = useRef(true),
    wasLoading = useRef(loading);
  const latest = useRef({ loading, onRevealComplete });
  latest.current = { loading, onRevealComplete };
  const finish = useCallback((generation: number) => {
    if (
      !mounted.current ||
      generation !== run.current ||
      latest.current.loading
    )
      return;
    setRevealed(true);
    if (wasLoading.current) {
      wasLoading.current = false;
      latest.current.onRevealComplete?.();
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      run.current++;
    };
  }, []);
  const timeline = useSharedValue({
    target: loading ? 0.66 : 1,
    duration,
    paused,
    reduced,
    generation: 0,
    notified: false,
    warmup: 2,
  });
  const previousLoading = useRef(loading);
  useEffect(() => {
    const generation = ++run.current;
    const restarting = loading && !previousLoading.current;
    if (loading) {
      wasLoading.current = true;
      setRevealed(false);
    }
    previousLoading.current = loading;
    // Reset and configure together on the UI runtime: RN-side reads can still
    // see the previous run while a shared-value reset is queued.
    scheduleOnUI(() => {
      "worklet";
      if (restarting) progress.set(0);
      timeline.set({
        target: loading ? 0.66 : 1,
        duration,
        paused,
        reduced,
        generation,
        notified: false,
        warmup: restarting ? 2 : timeline.get().warmup,
      });
    });
    return () => {
      run.current++;
      scheduleOnUI(() => {
        "worklet";
        timeline.set({ ...timeline.get(), paused: true });
      });
    };
  }, [loading, paused, reduced, duration, progress, timeline]);
  const ambientElapsed = useSharedValue(0);
  const animationClock = useFrameCallback((frame) => {
    "worklet";
    const state = timeline.get();
    if (state.paused || !canvasReady.get()) return;
    const size = canvasSize.get();
    if (size.width <= 0 || size.height <= 0) return;
    if (state.warmup > 0) {
      timeline.set({ ...state, warmup: state.warmup - 1 });
      return;
    }
    // withTiming uses wall time, including time spent mounting the Skia scene.
    // Bound each displayed step instead: a late frame slows the choreography
    // rather than jumping over the dot bloom, traces, reticle or scan reveal.
    const elapsed = Math.min(frame.timeSincePreviousFrame ?? 0, 1000 / 60);
    const current = progress.get();
    const next = state.reduced || state.duration === 0
      ? state.target
      : Math.min(state.target, current + elapsed / state.duration);
    if (next !== current) progress.set(next);
    if (state.target === 1 && next >= 1 && !state.notified) {
      timeline.set({ ...state, notified: true });
      scheduleOnRN(finish, state.generation);
    }
    if (!state.reduced && intensity > 0) {
      const ambient = ambientElapsed.get() + elapsed;
      if (Platform.OS === "web" || ambient >= 50) {
        ambientElapsed.set(0);
        loop.set(loop.get() + ambient * intensity / 5600);
      } else {
        ambientElapsed.set(ambient);
      }
    }
  }, false);
  useEffect(() => {
    animationClock.setActive(appActive && !paused && (loading || !revealed));
    return () => animationClock.setActive(false);
  }, [animationClock, appActive, paused, loading, revealed]);
  const reveal = useDerivedValue(
    () =>
      reduced
        ? progress.get() >= 1
          ? 1
          : 0
        : easeOut(windowProgress(progress.get() * 1.09, 0.74, 1.055)),
    [reduced, progress],
  );
  const clipStyle = useAnimatedStyle(
    () => ({ transform: [{ translateY: -(1 - reveal.get()) * frame.height }] }),
    [reveal, frame.height],
  );
  const contentStyle = useAnimatedStyle(
    () => ({
      opacity: reduced
        ? reveal.get()
        : easeOut(windowProgress(progress.get() * 1.09, 0.74, 1.085)),
      transform: [{ translateY: (1 - reveal.get()) * frame.height }],
    }),
    [reduced, reveal, progress, frame.height],
  );
  const canvasStyle = useAnimatedStyle(
    () => ({ opacity: 1 - windowProgress(progress.get(), 0.91, 1) }),
    [progress],
  );
  const context = useMemo(
    () => ({
      root,
      register,
      scaleX: frame.width / skeleton.width,
      scaleY: frame.height / skeleton.height,
    }),
    [frame, register, skeleton.width, skeleton.height],
  );
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0)
      setFrame((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
  };
  const hidden = loading || !revealed;
  return (
    <Measurement.Provider value={context}>
      <View
        ref={root}
        collapsable={false}
        onLayout={onLayout}
        style={[
          styles.frame,
          { aspectRatio: skeleton.width / skeleton.height, backgroundColor },
          style,
        ]}
        accessibilityState={{ busy: hidden }}
        aria-busy={hidden}
        accessibilityLabel={hidden ? loadingLabel : undefined}
      >
        <Animated.View
          style={[
            styles.fill,
            styles.clip,
            revealed && !loading ? styles.settled : clipStyle,
            { opacity: loading ? 0 : 1 },
          ]}
          pointerEvents={hidden ? "none" : "auto"}
          accessibilityElementsHidden={hidden}
          importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
          aria-hidden={hidden}
        >
          <Animated.View style={[styles.fill, revealed && !loading ? styles.settled : contentStyle]}>
            {children}
          </Animated.View>
        </Animated.View>
        {(!revealed || loading) && (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.fill, canvasStyle]}
          >
            <CanvasRenderer
              skeleton={skeleton}
              paths={paths}
              density={density}
              intensity={intensity}
              contrast={contrast}
              surfaceColor={surfaceColor}
              frame={frame}
              canvasReady={canvasReady}
              canvasSize={canvasSize}
              progress={progress}
              reveal={reveal}
              loop={loop}
              color={color}
              fieldColor={fieldColor}
              strongColor={strongColor}
              reduced={reduced}
            />
          </Animated.View>
        )}
      </View>
    </Measurement.Provider>
  );
}
const styles = StyleSheet.create({
  frame: { position: "relative", overflow: "visible", width: "100%" },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  clip: { overflow: "hidden" },
  settled: { opacity: 1, transform: [{ translateY: 0 }] },
});
