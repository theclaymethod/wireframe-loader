import { createContext, useContext, type ComponentType } from "react";
import type { SharedValue } from "react-native-reanimated";
const AnimationInputs = createContext<{ inputs: SharedValue<number>[]; contrast: number }>({ inputs: [], contrast: 1 });
export function useAnimationInputs() {
  return useContext(AnimationInputs).inputs;
}
export function useSceneContrast(override?: number) {
  const inherited = useContext(AnimationInputs).contrast;
  return inherited === 0 ? 0 : override ?? inherited;
}
import type { WireframeCanvasProps } from "./LoaderCore";
import { contrastInk, drawEase, smooth, windowProgress } from "./motion";
import { pointAt, type Scene, type SceneBox, type SceneStroke, type FieldDot } from "./scene";
export interface DotValues {
  x: number;
  y: number;
  r: number;
  opacity: number;
  color?: string;
}
export interface StrokeValues {
  end: number;
  phase: number;
  opacity: number;
  x?: number;
  y?: number;
}
export interface BoxValues {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}
export interface PrimitiveProps<T> {
  contrast?: number;
  motion: () => T;
  color: string;
}
export interface FieldProps {
  bounds: { x: number; y: number; width: number; height: number };
  motion: () => DotValues[];
  count: number;
}
export interface DrawingPrimitives {
  Field?: ComponentType<FieldProps>;
  Dot: ComponentType<PrimitiveProps<DotValues>>;
  Stroke: ComponentType<
    PrimitiveProps<StrokeValues> & {
      d: string;
      length: number;
      gap: number;
      width: number;
    }
  >;
  Box: ComponentType<PrimitiveProps<BoxValues> & { surface: string }>;
}
export type SceneProps = WireframeCanvasProps & {
  scene: Scene;
  primitives: DrawingPrimitives;
  layer?: "wire" | "decoration";
};
export function WireframeScene(props: SceneProps) {
  return (
    <AnimationInputs.Provider
      value={{ inputs: [props.progress, props.reveal, props.loop], contrast: props.contrast }}
    >
      <SceneDrawing {...props} />
    </AnimationInputs.Provider>
  );
}
function SceneDrawing({
  skeleton,
  scene,
  progress,
  reveal,
  loop,
  color: baseColor,
  fieldColor,
  strongColor: baseStrongColor,
  contrast,
  reduced,
  intensity,
  surfaceColor,
  layer = "decoration",
  primitives: { Dot, Stroke, Box, Field },
}: SceneProps) {
  const color = contrastInk(baseColor, fieldColor, contrast);
  const strongColor = contrastInk(baseStrongColor, fieldColor, contrast);
  const partColor = (s: SceneStroke, strong = false) =>
    s.emphasis?.color ?? contrastInk(strong ? baseStrongColor : baseColor, fieldColor, s.emphasis?.contrast ?? contrast);
  const { width: w, height: h } = skeleton;
  const phase = () => {
    "worklet";
    return reduced ? 0.7194 : progress.get() * 1.09;
  };
  const clean = () => {
    "worklet";
    return 1 - smooth(0.84, 1.04, phase());
  };
  const clock = () => {
    "worklet";
    return loop.get() * 5600;
  };
  const reticle = () => {
    "worklet";
    const p = phase(),
      targets = scene.targets;
    let active = -1;
    for (let k = 0; k < targets.length; k++)
      if (p >= targets[k].start) active = k;
    if (active < 0) return { x: 0, y: 0, width: w, height: h, opacity: 0 };
    const to = targets[active],
      from = active ? targets[active - 1] : { x: 0, y: 0, width: w, height: h },
      q = drawEase(windowProgress(p, to.start, to.start + 0.05));
    return {
      x: from.x + (to.x - from.x) * q - 5,
      y: from.y + (to.y - from.y) * q - 5,
      width: from.width + (to.width - from.width) * q + 10,
      height: from.height + (to.height - from.height) * q + 10,
      opacity: smooth(0.28, 0.32, p) * (1 - smooth(0.74, 0.8, p)),
    };
  };
  const fieldDot = (d: FieldDot, p: number, rb: ReturnType<typeof reticle>, time: number, revealAmount: number): DotValues => {
    "worklet";
              const radius =
                  drawEase(windowProgress(p, 0, 0.3)) *
                  (scene.maxDistance + 60),
                lag = radius - d.distance,
                env = windowProgress(lag, 0, 50),
                front =
                  !reduced && p < 0.35
                    ? Math.exp(-Math.pow((lag - 6) / 14, 2))
                    : 0,
                rainOn = smooth(0.04, 0.2, p) * (1 - smooth(0.62, 0.86, p)),
                headY =
                  ((time * d.speed + d.phase) % (h + 88 + d.trail)) - 44,
                back = headY - d.y,
                rain =
                  !reduced && intensity > 0 && back >= 0 && back < d.trail
                    ? Math.pow(1 - back / d.trail, 1.6) * rainOn * env * d.edge
                    : 0,
                near =
                  Math.max(
                    0,
                    1 -
                      Math.max(
                        rb.x - d.x,
                        d.x - rb.x - rb.width,
                        rb.y - d.y,
                        d.y - rb.y - rb.height,
                        0,
                      ) /
                        16,
                  ) *
                  (d.x > rb.x &&
                  d.x < rb.x + rb.width &&
                  d.y > rb.y &&
                  d.y < rb.y + rb.height
                    ? 1
                    : 0.6),
                pw = windowProgress(p, 0.02, 0.24),
                probeX = -44 + (w + 88) * drawEase(pw),
                probeOp =
                  !reduced && pw > 0 && pw < 1
                    ? smooth(0, 0.1, pw) * (1 - smooth(0.85, 1, pw))
                    : 0,
                probe =
                  Math.exp(-Math.pow((d.x - probeX) / 9, 2)) * probeOp * env,
                lit = Math.max(front, rain, near * rb.opacity * 0.8, probe),
                under =
                  d.inside &&
                  revealAmount > 0 &&
                  d.y < revealAmount * (h + 6) - 3
                    ? 0
                    : 1;
              return {
                x: d.x,
                y: d.y,
                r: 1.05 + lit * 0.85,
                color: lit > 0.35 ? strongColor : fieldColor,
                opacity:
                  Math.max(env * 0.5 * d.edge, lit * d.edge) *
                  clean() *
                  under *
                  (lit > 0.35 ? 1 : 0.32),
              };
  };
  const fieldMotion = () => {
    "worklet";
    const p = phase(), rb = reticle(), time = clock(), amount = reveal.get();
    return scene.dots.map((d) => fieldDot(d, p, rb, time, amount));
  };
  const wire = layer === "wire";
  return (
    <>
      {!wire && (Field ? <Field motion={fieldMotion} count={scene.dots.length} bounds={{ x: -scene.margin, y: -scene.margin, width: w + 2 * scene.margin, height: h + 2 * scene.margin }} /> :
        scene.dots.map((d, i) => (
          <Dot key={`field${i}`} color={fieldColor} motion={() => {
            "worklet";
            return fieldDot(d, phase(), reticle(), clock(), reveal.get());
          }} />
        )))}
      {scene.strokes
        .filter((s) => (wire ? !s.guide : !!s.guide))
        .map((s) => (
          <Stroke
            key={s.id}
            d={s.d}
            length={s.length}
            color={partColor(s)}
            contrast={s.emphasis?.contrast}
            gap={s.guide ? 6.5 / Math.sqrt(scene.density) : s.emphasis?.dotSpacing ?? scene.gap}
            width={s.guide ? 1.6 : s.emphasis?.strokeWidth ?? 2.1}
            motion={() => {
              "worklet";
              const p = phase(),
                end = drawEase(windowProgress(p, s.start, s.end)),
                opacity =
                  s.guide === "frame"
                    ? 0.5 * (1 - smooth(0.66, 0.92, p))
                    : s.guide === "part"
                      ? 0.5 * (1 - smooth(0.72, 0.84, p))
                      : 1 - 0.6 * reveal.get();
              return {
                end,
                phase: reduced
                  ? 0
                  : -(clock() * 0.016) %
                    (s.guide ? 6.5 / Math.sqrt(scene.density) : s.emphasis?.dotSpacing ?? scene.gap),
                opacity: end > 0 ? opacity : 0,
              };
            }}
          />
        ))}
      {wire &&
        scene.strokes
          .filter((s) => !s.guide)
          .flatMap((s) => [
            ...(!reduced
              ? [
                  <Dot
                    key={`head${s.id}`}
                    color={partColor(s, true)}
                    contrast={s.emphasis?.contrast}
                    motion={() => {
                      "worklet";
                      const q = windowProgress(phase(), s.start, s.end),
                        f =
                          (Math.floor((s.length * drawEase(q)) / (s.emphasis?.dotSpacing ?? scene.gap)) *
                            (s.emphasis?.dotSpacing ?? scene.gap)) /
                          s.length,
                        pt = pointAt(s.points, f);
                      return {
                        x: pt.x,
                        y: pt.y,
                        r: s.id.startsWith("outline") ? 2.8 : 2.4,
                        opacity: q > 0 && q < 1 ? 1 - 0.6 * reveal.get() : 0,
                      };
                    }}
                  />,
                ]
              : []),
            ...(s.caps
              ? [0, 1].map((k) => (
                  <Dot
                    key={`cap${s.id}-${k}`}
                    color={partColor(s, true)}
                    contrast={s.emphasis?.contrast}
                    motion={() => {
                      "worklet";
                      const q = windowProgress(phase(), s.start, s.end),
                        pt = pointAt(s.points, k);
                      return {
                        x: pt.x,
                        y: pt.y,
                        r: 1.7,
                        opacity: (k ? q >= 1 : q > 0)
                          ? 1 - 0.6 * reveal.get()
                          : 0,
                      };
                    }}
                  />
                ))
              : []),
          ])}
      {!wire &&
        scene.boxes.flatMap((b, i) =>
          [0, 1, 2, 3].map((j) => (
            <Box
              key={`corner${i}-${j}`}
              color={strongColor}
              surface={surfaceColor}
              motion={() => {
                "worklet";
                const p = phase(),
                  start = i === 0 ? (j >= 2 ? 0.37 : 0.17) : b.start + 0.04,
                  out =
                    i === 0
                      ? 1 - smooth(0.82, 0.96, p)
                      : 1 - smooth(0.72, 0.84, p),
                  size =
                    (i === 0 ? 5 : 4) *
                    drawEase(
                      windowProgress(p, start, start + (i === 0 ? 0.1 : 0.08)),
                    ) *
                    out;
                return {
                  x: b.x + (j === 1 || j === 2 ? b.width : 0) - size / 2,
                  y: b.y + (j >= 2 ? b.height : 0) - size / 2,
                  width: size,
                  height: size,
                  opacity: size > 0.01 ? 1 : 0,
                };
              }}
            />
          )),
        )}
      {!wire &&
        !reduced &&
        scene.flyers.map((f, i) => (
          <Dot
            key={`flyer${i}`}
            color={strongColor}
            motion={() => {
              "worklet";
              const p = phase(),
                q = windowProgress(p, f.start, f.end),
                e = drawEase(q),
                energy = Math.max(0, intensity - 1),
                arc = Math.sin(q * Math.PI) * energy * 12;
              return {
                x:
                  f.to.x +
                  (f.from.x - f.to.x) * (1 - e) * intensity +
                  arc * Math.cos(f.seed * 6.28),
                y:
                  f.to.y +
                  (f.from.y - f.to.y) * (1 - e) * intensity +
                  arc * Math.sin(f.seed * 6.28),
                r: 1.6,
                opacity:
                  intensity > 0 && p >= f.start && p < f.end + 0.01
                    ? smooth(0, 0.25, q)
                    : 0,
              };
            }}
          />
        ))}
      {!wire &&
        !reduced &&
        [0, 1, 2, 3].map((i) => (
          <Stroke
            key={`reticle${i}`}
            d={["M0 7V0H7", "M-7 0H0V7", "M0 -7V0H-7", "M7 0H0V-7"][i]}
            length={14}
            gap={0}
            width={1.2}
            color={strongColor}
            motion={() => {
              "worklet";
              const b = reticle();
              return {
                end: 1,
                phase: 0,
                x: b.x + (i === 1 || i === 2 ? b.width : 0),
                y: b.y + (i >= 2 ? b.height : 0),
                opacity: b.opacity,
              };
            }}
          />
        ))}
      {!wire && !reduced && (
        <Stroke
          d={`M0 -44V${h + 44}`}
          length={h + 88}
          gap={5}
          width={1.6}
          color={color}
          motion={() => {
            "worklet";
            const pw = windowProgress(phase(), 0.02, 0.24);
            return {
              end: 1,
              phase: 0,
              x: -44 + drawEase(pw) * (w + 88),
              opacity:
                pw > 0 && pw < 1
                  ? 0.8 * smooth(0, 0.1, pw) * (1 - smooth(0.85, 1, pw))
                  : 0,
            };
          }}
        />
      )}
      {!wire && !reduced && (
        <Stroke
          d={`M-18 0H${w + 18}`}
          length={w + 36}
          gap={5}
          width={1.6}
          color={color}
          motion={() => {
            "worklet";
            const sq = reveal.get();
            return {
              end: 1,
              phase: -(clock() * 0.032) % 5,
              y: sq * (h + 6) - 3,
              opacity:
                sq > 0 && sq < 1
                  ? smooth(0, 0.12, sq) * (1 - smooth(0.85, 1, sq))
                  : 0,
            };
          }}
        />
      )}
      {!wire &&
        !reduced &&
        [0, w].map((x) => (
          <Dot
            key={`scan${x}`}
            color={strongColor}
            motion={() => {
              "worklet";
              const sq = reveal.get();
              return {
                x,
                y: sq * (h + 6) - 3,
                r: 2.3,
                opacity:
                  sq > 0 && sq < 1
                    ? smooth(0, 0.12, sq) * (1 - smooth(0.85, 1, sq))
                    : 0,
              };
            }}
          />
        ))}
      {wire &&
        !reduced &&
        intensity > 1 &&
        scene.strokes
          .filter((s) => !s.guide)
          .flatMap((s, j) =>
            Array.from({ length: Math.ceil((intensity - 1) * 2) }, (_, k) => (
              <Dot
                key={`orbit${s.id}-${k}`}
                color={partColor(s, true)}
                    contrast={s.emphasis?.contrast}
                motion={() => {
                  "worklet";
                  const q =
                      (loop.get() * (1 + intensity * 0.7) +
                        j * 0.13 +
                        k * 0.31) %
                      1,
                    pt = pointAt(s.points, q),
                    energy = (intensity - 1) * 4 * Math.sin(q * 18 + j);
                  return {
                    x: pt.x + Math.cos(q * 12) * energy,
                    y: pt.y + Math.sin(q * 12) * energy,
                    r: 1.4 + (intensity - 1) * 0.3,
                    opacity:
                      windowProgress(phase(), s.end - 0.05, s.end) *
                      clean() *
                      0.65,
                  };
                }}
              />
            )),
          )}
    </>
  );
}
