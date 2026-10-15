import { useEffect, useMemo } from "react";
import { View } from "react-native";
import {
  Picture,
  Skia,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  Rect,
} from "@shopify/react-native-skia";
import { scheduleOnUI } from "react-native-worklets";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import type { WireframeCanvasProps } from "./LoaderCore";
import { contrastInk } from "./motion";
import { buildScene } from "./scene";
import {
  WireframeScene,
  useAnimationInputs,
  useSceneContrast,
  type DrawingPrimitives,
  type FieldProps,
} from "./WireframeScene";
// A single UI worklet records the field, instead of six animated values per dot.
function Field({ motion, bounds }: FieldProps) {
  const inputs = useAnimationInputs();
  const contrast = useSceneContrast();
  const picture = useDerivedValue(() => {
    "worklet";
    inputs.forEach((v) => v.get());
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(bounds);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    for (const dot of motion()) {
      const opacity = Math.min(1, dot.opacity * contrast);
      if (opacity <= 0) continue;
      paint.setColor(Skia.Color(dot.color ?? "#0d0d0d"));
      paint.setAlphaf(opacity);
      canvas.drawCircle(dot.x, dot.y, dot.r, paint);
    }
    const result = recorder.finishRecordingAsPicture();
    paint.dispose();
    recorder.dispose();
    return result;
  }, [motion, contrast, bounds.x, bounds.y, bounds.width, bounds.height, ...inputs]);
  return <Picture picture={picture} />;
}
const primitives: DrawingPrimitives = {
  Field,
  Dot: ({ motion, color, contrast: localContrast }) => {
    const inputs = useAnimationInputs();
    const contrast = useSceneContrast(localContrast);
    const a = useDerivedValue(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const value = motion();
      return { ...value, opacity: Math.min(1, value.opacity * contrast) };
    }, [motion, contrast, ...inputs]),
      cx = useDerivedValue(() => a.get().x, [a]),
      cy = useDerivedValue(() => a.get().y, [a]),
      r = useDerivedValue(() => a.get().r, [a]),
      opacity = useDerivedValue(() => a.get().opacity, [a]),
      ink = useDerivedValue(() => a.get().color ?? color, [a, color]);
    return <Circle cx={cx} cy={cy} r={r} opacity={opacity} color={ink} />;
  },
  Box: ({ motion, color, surface, contrast: localContrast }) => {
    const inputs = useAnimationInputs();
    const contrast = useSceneContrast(localContrast);
    const a = useDerivedValue(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const value = motion();
      return { ...value, opacity: Math.min(1, value.opacity * contrast) };
    }, [motion, contrast, ...inputs]),
      rect = useDerivedValue(() => {
        const v = a.get();
        return { x: v.x, y: v.y, width: v.width, height: v.height };
      }, [a]),
      opacity = useDerivedValue(() => a.get().opacity, [a]);
    return (
      <Group opacity={opacity}>
        <Rect rect={rect} color={surface} />
        <Rect rect={rect} color={color} style="stroke" strokeWidth={1} />
      </Group>
    );
  },
  Stroke: ({ d, gap, width, motion, color, contrast: localContrast }) => {
    const inputs = useAnimationInputs();
    const contrast = useSceneContrast(localContrast);
    const a = useDerivedValue(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const value = motion();
      return { ...value, opacity: Math.min(1, value.opacity * contrast) };
    }, [motion, contrast, ...inputs]),
      end = useDerivedValue(() => a.get().end, [a]),
      opacity = useDerivedValue(() => a.get().opacity, [a]),
      phase = useDerivedValue(() => a.get().phase, [a]),
      transform = useDerivedValue(
        () => [{ translateX: a.get().x ?? 0 }, { translateY: a.get().y ?? 0 }],
        [a],
      );
    return (
      <Path
        path={d}
        color={color}
        style="stroke"
        strokeWidth={width}
        strokeCap="round"
        end={end}
        opacity={opacity}
        transform={transform}
      >
        {gap > 0 && <DashPathEffect intervals={[0.01, gap]} phase={phase} />}
      </Path>
    );
  },
};
// This effect belongs to Skia's separate React root, after all drawing nodes
// have registered their worklets. Canvas layout alone can precede that commit.
function SceneReady({ ready }: { ready: SharedValue<boolean> }) {
  useEffect(() => {
    scheduleOnUI(() => {
      "worklet";
      ready.set(true);
    });
    return () => ready.set(false);
  }, [ready]);
  return null;
}
export function SkiaWireframeCanvas(props: WireframeCanvasProps) {
  const { skeleton, frame, reveal, color, reduced, canvasSize } = props;
  useEffect(() => () => canvasSize.set({ width: 0, height: 0 }), [canvasSize]);
  const scene = useMemo(
    () => buildScene(skeleton, props.paths, props.density),
    [skeleton, props.paths, props.density],
  );
  const sx = frame.width / skeleton.width,
    sy = frame.height / skeleton.height,
    m = scene.margin;
  const clip = useDerivedValue(
    () => ({
      x: -m,
      y: reveal.get() > 0 ? reveal.get() * (skeleton.height + 6) - 3 : -m,
      width: skeleton.width + 2 * m,
      height: skeleton.height + 2 * m,
    }),
    [reveal, skeleton.width, skeleton.height, m],
  );
  const scanY = useDerivedValue(
    () => reveal.get() * (skeleton.height + 6) - 3,
    [reveal, skeleton.height],
  );
  const scanOpacity = useDerivedValue(
    () => (reveal.get() > 0 && reveal.get() < 1 ? 1 : 0),
    [reveal],
  );
  const glowY = useDerivedValue(() => scanY.get() - 28, [scanY]),
    glowStart = useDerivedValue(() => ({ x: 0, y: scanY.get() - 28 }), [scanY]),
    glowEnd = useDerivedValue(() => ({ x: 0, y: scanY.get() }), [scanY]);
  return (
    <View
      collapsable={false}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        canvasSize.set({ width, height });
      }}
      style={{
        position: "absolute",
        left: -m * sx,
        top: -m * sy,
        width: frame.width + 2 * m * sx,
        height: frame.height + 2 * m * sy,
      }}
    >
    <Canvas style={{ width: "100%", height: "100%" }}>
      <Group
        transform={[
          { scaleX: sx },
          { scaleY: sy },
          { translateX: m },
          { translateY: m },
        ]}
      >
        <WireframeScene
          {...props}
          scene={scene}
          primitives={primitives}
          layer="decoration"
        />
        <Group clip={clip}>
          <WireframeScene
            {...props}
            scene={scene}
            primitives={primitives}
            layer="wire"
          />
        </Group>
        {!reduced && (
          <Group opacity={scanOpacity}>
            <Rect
              x={0}
              y={glowY}
              width={skeleton.width}
              height={28}
              opacity={Math.min(1, 0.12 * props.contrast)}
            >
              <LinearGradient
                start={glowStart}
                end={glowEnd}
                colors={["transparent", contrastInk(color, props.fieldColor, props.contrast)]}
              />
            </Rect>
          </Group>
        )}
      </Group>
      <SceneReady ready={props.canvasReady} />
    </Canvas>
    </View>
  );
}
