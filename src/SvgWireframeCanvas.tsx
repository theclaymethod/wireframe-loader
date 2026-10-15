import { useEffect, useId, useMemo } from "react";
import { Platform } from "react-native";
import { svgPathProperties } from "svg-path-properties";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Stop,
  Mask,
  Path,
  Rect,
} from "react-native-svg";
import type { WireframeCanvasProps } from "./LoaderCore";
import { contrastInk } from "./motion";
import { buildScene } from "./scene";
import {
  WireframeScene,
  useAnimationInputs,
  useSceneContrast,
  type DrawingPrimitives,
} from "./WireframeScene";
const APath = Animated.createAnimatedComponent(Path),
  ACircle = Animated.createAnimatedComponent(Circle),
  ARect = Animated.createAnimatedComponent(Rect),
  AGroup = Animated.createAnimatedComponent(G);
function useKey() {
  return useId().replace(/[^a-zA-Z0-9]/g, "");
}
function NativeStroke({ d, gap, width, motion, color, contrast: localContrast }: import("react").ComponentProps<DrawingPrimitives["Stroke"]>) {
  const inputs = useAnimationInputs();
  const contrast = useSceneContrast(localContrast);
  const points = useMemo(() => {
    const path = new svgPathProperties(d);
    const length = path.getTotalLength();
    return Array.from({ length: 193 }, (_, i) => path.getPointAtLength(length * i / 192));
  }, [d]);
  const props = useAnimatedProps(() => {
    "worklet";
    inputs.forEach((value) => value.get());
    const a = motion();
    const end = Math.max(0, Math.min(192, a.end * 192));
    const n = Math.floor(end);
    let path = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i <= n; i++) path += `L${points[i].x} ${points[i].y}`;
    if (n < 192) {
      const t = end - n, p = points[n], q = points[n + 1];
      path += `L${p.x + (q.x - p.x) * t} ${p.y + (q.y - p.y) * t}`;
    }
    return { d: a.end >= 1 ? d : path, opacity: Math.min(1, a.opacity * contrast), strokeDashoffset: a.phase,
      matrix: [1, 0, 0, 1, a.x ?? 0, a.y ?? 0] };
  }, [motion, contrast, points, d, ...inputs]);
  return <APath fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"
    strokeDasharray={gap ? [0.01, gap] : undefined} animatedProps={props} />;
}
const primitives: DrawingPrimitives = {
  Dot: ({ motion, color, contrast: localContrast }) => {
    const inputs = useAnimationInputs();
    const contrast = useSceneContrast(localContrast);
    const props = useAnimatedProps(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const a = motion();
      return {
        cx: a.x,
        cy: a.y,
        r: a.r,
        opacity: Math.min(1, a.opacity * contrast),
        fill: a.color ?? color,
      };
    }, [motion, contrast, ...inputs]);
    return <ACircle fill={color} animatedProps={props} />;
  },
  Box: ({ motion, color, surface, contrast: localContrast }) => {
    const inputs = useAnimationInputs();
    const contrast = useSceneContrast(localContrast);
    const props = useAnimatedProps(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const value = motion();
      return { ...value, opacity: Math.min(1, value.opacity * contrast) };
    }, [motion, contrast, ...inputs]);
    return (
      <ARect
        stroke={color}
        strokeWidth={1}
        fill={surface}
        animatedProps={props}
      />
    );
  },
  Stroke: ({ d, length, gap, width, motion, color, contrast: localContrast }) => {
    if (Platform.OS !== "web") return <NativeStroke d={d} length={length} gap={gap} width={width} motion={motion} color={color} contrast={localContrast} />;
    const inputs = useAnimationInputs();
    const contrast = useSceneContrast(localContrast);
    const id = useKey(),
      trim = useAnimatedProps(() => {
        "worklet";
        inputs.forEach((value) => value.get());
        return { strokeDashoffset: length * (1 - motion().end) };
      }, [motion, length, ...inputs]);
    const props = useAnimatedProps(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const a = motion();
      return {
        strokeDashoffset: a.phase,
        opacity: Math.min(1, a.opacity * contrast),
      };
    }, [motion, contrast, ...inputs]);
    const transform = useAnimatedProps<{ transform?: string; matrix?: number[] }>(() => {
      "worklet";
      inputs.forEach((value) => value.get());
      const a = motion();
      return Platform.OS === "web"
        ? { transform: `translate(${a.x ?? 0} ${a.y ?? 0})` }
        : { matrix: [1, 0, 0, 1, a.x ?? 0, a.y ?? 0] };
    }, [motion, contrast, ...inputs]);
    return (
      <AGroup animatedProps={transform}>
        <Defs>
          <Mask
            id={id}
            maskUnits="userSpaceOnUse"
            x={-50}
            y={-50}
            width="200%"
            height="200%"
          >
            <APath
              d={d}
              fill="none"
              stroke="white"
              strokeWidth={width + 3}
              strokeDasharray={[length, length]}
              animatedProps={trim}
            />
          </Mask>
        </Defs>
        <APath
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={gap ? `.01 ${gap}` : undefined}
          mask={`url(#${id})`}
          animatedProps={props}
        />
      </AGroup>
    );
  },
};
export function SvgWireframeCanvas(props: WireframeCanvasProps) {
  useEffect(() => {
    props.canvasReady.set(true);
    // react-native-svg on web does not emit React Native layout events.
    if (Platform.OS === "web") {
      props.canvasSize.set({ width: props.frame.width, height: props.frame.height });
    }
    return () => {
      props.canvasReady.set(false);
      props.canvasSize.set({ width: 0, height: 0 });
    };
  }, [props.canvasReady, props.canvasSize, props.frame.width, props.frame.height]);
  const { skeleton, frame, reveal, color, reduced } = props,
    id = useKey();
  const scene = useMemo(
    () => buildScene(skeleton, props.paths, props.density),
    [skeleton, props.paths, props.density],
  );
  const sx = frame.width / skeleton.width,
    sy = frame.height / skeleton.height,
    m = scene.margin;
  const clip = useAnimatedProps(() => {
    "worklet";
    return {
      y: reveal.get() > 0 ? reveal.get() * (skeleton.height + 6) - 3 : -m,
      height: skeleton.height + 2 * m,
    };
  }, [reveal, skeleton.height, m]);
  const glow = useAnimatedProps(() => {
    "worklet";
    return {
      y: reveal.get() * (skeleton.height + 6) - 3 - 28,
      opacity: reveal.get() > 0 && reveal.get() < 1 ? 1 : 0,
    };
  }, [reveal, skeleton.height]);
  return (
    <Svg
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        props.canvasSize.set({ width, height });
      }}
      width={frame.width + 2 * m * sx}
      height={frame.height + 2 * m * sy}
      style={{ position: "absolute", left: -m * sx, top: -m * sy }}
      viewBox={`${-m} ${-m} ${skeleton.width + 2 * m} ${skeleton.height + 2 * m}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id={`${id}glow`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={contrastInk(color, props.fieldColor, props.contrast)} stopOpacity={0} />
          <Stop offset="1" stopColor={contrastInk(color, props.fieldColor, props.contrast)} stopOpacity={Math.min(1, 0.12 * props.contrast)} />
        </LinearGradient>
        <ClipPath id={id}>
          <ARect x={-m} width={skeleton.width + 2 * m} animatedProps={clip} />
        </ClipPath>
      </Defs>
      <WireframeScene
        {...props}
        scene={scene}
        primitives={primitives}
        layer="decoration"
      />
      <G clipPath={`url(#${id})`}>
        <WireframeScene
          {...props}
          scene={scene}
          primitives={primitives}
          layer="wire"
        />
      </G>
      {!reduced && (
        <ARect
          x={0}
          width={skeleton.width}
          height={28}
          fill={`url(#${id}glow)`}
          animatedProps={glow}
        />
      )}
    </Svg>
  );
}
