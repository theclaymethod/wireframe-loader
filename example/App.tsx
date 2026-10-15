import { useEffect, useRef, useState } from "react";
import {
  AppState,
  useWindowDimensions,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HeartRateCard, heartSkeleton, heartEmphasis } from "./HeartRateCard";
import { SkiaWireframeLoader } from "../src/skia";
import {
  WireframeLoader,
  WireframePart,
  wireframePresets,
  type WireframeSkeleton,
} from "../src";

// The skeleton and card share a single reserved frame, including before data exists.
const skeleton: WireframeSkeleton = {
  width: 344,
  height: 300,
  radius: 24,
  parts: [
    { id: "name", kind: "line", x: 24, y: 45, width: 164 },
    { id: "description", kind: "line", x: 24, y: 75, width: 246 },
    {
      id: "image",
      kind: "rect",
      x: 24,
      y: 104,
      width: 296,
      height: 108,
      radius: 12,
    },
    {
      id: "action",
      kind: "rect",
      x: 24,
      y: 236,
      width: 296,
      height: 40,
      radius: 12,
    },
  ],
};

function ResultCard({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={styles.card}>
      <WireframePart id="name">
        <Text style={styles.title}>A place to focus</Text>
      </WireframePart>
      <WireframePart id="description">
        <Text style={styles.description}>Your workspace is ready.</Text>
      </WireframePart>
      <WireframePart id="image" style={styles.image}>
        <View style={styles.hillA} />
        <View style={styles.hillB} />
      </WireframePart>
      <WireframePart id="action">
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          onPress={onOpen}
        >
          <Text style={styles.actionText}>Open workspace</Text>
        </Pressable>
      </WireframePart>
    </View>
  );
}

export default function App() {
  const [sample, setSample] = useState<"heart" | "workspace">("heart");
  const activeSkeleton = sample === "heart" ? heartSkeleton : skeleton;
  const wide = useWindowDimensions().width >= 850;
  const [renderer, setRenderer] = useState<"svg" | "skia">(Platform.OS === "web" ? "svg" : "skia");
  const [duration, setDuration] = useState<number>(wireframePresets.default.duration);
  const [density, setDensity] = useState<number>(wireframePresets.default.density);
  const [intensity, setIntensity] = useState<number>(wireframePresets.default.intensity);
  const [contrast, setContrast] = useState<number>(wireframePresets.default.contrast);
  const Loader = renderer === "skia" ? SkiaWireframeLoader : WireframeLoader;
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(AppState.currentState !== "active");
  const [reduced, setReduced] = useState<boolean | undefined>(undefined);
  const [message, setMessage] = useState("Waiting for data");
  const [cycle, setCycle] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setPaused(state !== "active"),
    );
    return () => {
      subscription.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  function retry() {
    if (timer.current) clearTimeout(timer.current);
    setCycle((value) => value + 1);
    setLoading(true);
    setMessage("Waiting for data");
    timer.current = setTimeout(() => {
      setLoading(false);
      setMessage("Revealing component");
    }, 1800);
  }
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text role="heading" style={styles.heading}>
          Wireframe loading
        </Text>
        <Text style={styles.intro}>
          The component’s outline holds until data arrives, then draws directly
          into the real UI.
        </Text>
        <View style={[styles.workbench, wide && styles.workbenchWide]}>
          <View style={styles.pane}>
            <View style={styles.preview}>
              <Loader
                key={`${renderer}-${sample}-${cycle}`}
                loading={loading}
                skeleton={activeSkeleton}
                emphasis={sample === "heart" ? heartEmphasis : undefined}
                duration={duration}
                density={density}
                intensity={intensity}
                contrast={contrast}
                surfaceColor="#fcfcfa"
                paused={paused}
                reducedMotion={reduced}
                style={{
                  width: activeSkeleton.width,
                  height: activeSkeleton.height,
                }}
                color="#9a9a9a"
                fieldColor="#0d0d0d"
                loadingLabel={
                  sample === "heart"
                    ? "Loading heart rate"
                    : "Loading workspace"
                }
                onRevealComplete={() => setMessage("Component ready")}
              >
                {!loading &&
                  (sample === "heart" ? (
                    <HeartRateCard
                      onOpen={() => setMessage("Heart rate details opened")}
                    />
                  ) : (
                    <ResultCard
                      key={cycle}
                      onOpen={() => setMessage("Workspace opened")}
                    />
                  ))}
              </Loader>
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                disabled={!loading}
                style={[styles.button, { opacity: loading ? 1 : 0.45 }]}
                onPress={() => {
                  if (timer.current) clearTimeout(timer.current);
                  setLoading(false);
                  setMessage("Revealing component");
                }}
              >
                <Text style={styles.buttonText}>Data ready</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.button}
                onPress={retry}
              >
                <Text style={styles.buttonText}>Load again</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.pane}>
            <View style={styles.controls}>
              {["heart", "workspace"].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sample === value }}
                  style={styles.quietButton}
                  onPress={() => {
                    if (timer.current) clearTimeout(timer.current);
                    setSample(value as "heart" | "workspace");
                    setLoading(true);
                    setMessage("Waiting for data");
                  }}
                >
                  <Text>{value === "heart" ? "Heart rate" : "Workspace"}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                style={styles.quietButton}
                onPress={() => {
                  if (timer.current) clearTimeout(timer.current);
                  setRenderer((v) => (v === "svg" ? "skia" : "svg"));
                  setLoading(true);
                  setMessage("Waiting for data");
                }}
              >
                <Text>
                  {renderer === "svg" ? "Renderer: SVG" : "Renderer: Skia"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                style={styles.quietButton}
                onPress={() => {
                  setDensity(wireframePresets.sparse.density);
                  setIntensity(wireframePresets.sparse.intensity);
                  setDuration(wireframePresets.sparse.duration);
                }}
              >
                <Text>Sparse</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.quietButton}
                onPress={() => {
                  setDensity(wireframePresets.reference.density);
                  setIntensity(wireframePresets.reference.intensity);
                  setDuration(wireframePresets.reference.duration);
                }}
              >
                <Text>Reference</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.quietButton}
                onPress={() => {
                  setDensity(wireframePresets.overdrive.density);
                  setIntensity(wireframePresets.overdrive.intensity);
                  setDuration(wireframePresets.overdrive.duration);
                }}
              >
                <Text>Overdrive</Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Text style={styles.controlLabel}>
                Density {density.toFixed(2)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease density"
                style={styles.stepButton}
                onPress={() => setDensity((v) => Math.max(0.25, v - 0.25))}
              >
                <Text>−</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase density"
                style={styles.stepButton}
                onPress={() => setDensity((v) => Math.min(2, v + 0.25))}
              >
                <Text>+</Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Text style={styles.controlLabel}>
                Intensity {intensity.toFixed(2)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease intensity"
                style={styles.stepButton}
                onPress={() => setIntensity((v) => Math.max(0, v - 0.25))}
              >
                <Text>−</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase intensity"
                style={styles.stepButton}
                onPress={() => setIntensity((v) => Math.min(3, v + 0.25))}
              >
                <Text>+</Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Text style={styles.controlLabel}>
                Contrast {contrast.toFixed(2)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease contrast"
                disabled={contrast === 0}
                style={[styles.stepButton, { opacity: contrast === 0 ? 0.45 : 1 }]}
                onPress={() => setContrast((v) => Math.max(0, v - 0.25))}
              >
                <Text>−</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase contrast"
                disabled={contrast === 3}
                style={[styles.stepButton, { opacity: contrast === 3 ? 0.45 : 1 }]}
                onPress={() => setContrast((v) => Math.min(3, v + 0.25))}
              >
                <Text>+</Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Text style={styles.controlLabel}>
                Duration {(duration / 1000).toFixed(1)}s
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease duration"
                style={styles.stepButton}
                onPress={() => setDuration((v) => Math.max(0, v - 200))}
              >
                <Text>−</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase duration"
                style={styles.stepButton}
                onPress={() => setDuration((v) => Math.min(5000, v + 200))}
              >
                <Text>+</Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                style={styles.quietButton}
                onPress={() => setPaused((value) => !value)}
              >
                <Text>{paused ? "Resume" : "Pause"}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: reduced === true }}
                aria-checked={reduced === true}
                style={styles.quietButton}
                onPress={() => setReduced((value) => !value)}
              >
                <Text>{reduced ? "Use motion" : "Reduce motion"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  workbench: { width: "100%", maxWidth: 900, gap: 36, alignItems: "center" },
  workbenchWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 90,
  },
  pane: { width: 344, maxWidth: "100%", alignItems: "center" },
  page: { flex: 1, backgroundColor: "#f4f3ef" },
  pageContent: { padding: 24, paddingTop: 64, alignItems: "center" },
  heading: {
    fontSize: 32,
    fontWeight: "500",
    letterSpacing: -1,
    color: "#252a27",
    marginBottom: 16,
  },
  intro: {
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 390,
    color: "#676d68",
    textAlign: "center",
    marginBottom: 36,
  },
  preview: {
    width: "100%",
    maxWidth: 344,
    borderRadius: 24,
    marginTop: 12,
    marginBottom: 18,
  },
  card: {
    height: 300,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#fcfcfa",
  },
  title: { fontSize: 21, fontWeight: "500", lineHeight: 27, color: "#242e29" },
  description: { fontSize: 14, lineHeight: 22, marginTop: 8, color: "#737c76" },
  image: {
    height: 108,
    marginTop: 23,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: "#e0e6da",
    overflow: "hidden",
  },
  hillA: {
    position: "absolute",
    width: 240,
    height: 140,
    borderRadius: 90,
    backgroundColor: "#a1b0a0",
    left: -32,
    top: 40,
    transform: [{ rotate: "-18deg" }],
  },
  hillB: {
    position: "absolute",
    width: 220,
    height: 150,
    borderRadius: 90,
    backgroundColor: "#6f8778",
    right: -62,
    top: 40,
    transform: [{ rotate: "18deg" }],
  },
  action: {
    height: 40,
    borderRadius: 12,
    backgroundColor: "#344e40",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  message: { marginTop: 24, fontSize: 14, color: "#626f66" },
  controls: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#e4e7df",
    justifyContent: "center",
  },
  buttonText: { fontSize: 15, color: "#263a2c" },
  controlLabel: {
    minWidth: 120,
    alignSelf: "center",
    fontSize: 15,
    color: "#39483f",
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#e4e7df",
    alignItems: "center",
    justifyContent: "center",
  },
  quietButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
});
