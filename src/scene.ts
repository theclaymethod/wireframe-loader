import { pathGeometry } from "./pathGeometry";
import type { WireframePath, WireframeSkeleton } from "./geometry";
import { drawEase } from "./motion";
export interface Point {
  x: number;
  y: number;
}
export interface SceneStroke extends WireframePath {
  points: Point[];
  start: number;
  end: number;
  guide?: "frame" | "part";
  caps?: boolean;
}
export interface SceneBox {
  x: number;
  y: number;
  width: number;
  height: number;
  start: number;
}
export interface SceneFlyer {
  from: Point;
  to: Point;
  start: number;
  end: number;
  seed: number;
}
export interface FieldDot extends Point {
  distance: number;
  edge: number;
  inside: boolean;
  speed: number;
  phase: number;
  trail: number;
}
export interface Scene {
  strokes: SceneStroke[];
  boxes: SceneBox[];
  dots: FieldDot[];
  maxDistance: number;
  flyers: SceneFlyer[];
  margin: number;
  gap: number;
  density: number;
  targets: SceneBox[];
}
export function seed(n: number) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
export function buildScene(
  skeleton: WireframeSkeleton,
  paths: WireframePath[],
  density: number,
): Scene {
  const { width: w, height: h } = skeleton,
    margin = 44,
    gap = 4.8 / Math.sqrt(density),
    step = Math.max(
      15 / Math.sqrt(density),
      Math.sqrt(((w + 88) * (h + 88)) / 2400),
    );
  const dots: FieldDot[] = [];
  let maxDistance = 0;
  for (let x = -Math.floor(margin / step) * step; x <= w + margin; x += step)
    for (
      let y = -Math.floor(margin / step) * step;
      y <= h + margin;
      y += step
    ) {
      const distance = Math.hypot(x - w / 2, y - h / 2),
        out = Math.max(0, -x, x - w, -y, y - h),
        col = Math.round(x / step);
      maxDistance = Math.max(maxDistance, distance);
      dots.push({
        x,
        y,
        distance,
        edge: 1 - Math.min(1, out / margin),
        inside: out === 0,
        speed: 0.07 + 0.09 * seed(col * 7.13 + 31.7),
        phase: seed(col * 3.71 + 11.3) * 900,
        trail: 50 + 70 * seed(col * 1.91 + 1),
      });
    }
  const strokes: SceneStroke[] = [],
    targets: SceneBox[] = [];
  function add(
    d: string,
    id: string,
    start: number,
    end: number,
    guide?: SceneStroke["guide"],
    caps = false,
  ) {
    const { length, points } = pathGeometry(d);
    strokes.push({ d, id, length, points, start, end, guide, caps });
  }
  function halves(
    x: number,
    y: number,
    bw: number,
    bh: number,
    r: number,
    id: string,
    start: number,
    end: number,
  ) {
    r = Math.max(0.001, Math.min(r, bw / 2, bh / 2));
    for (const direction of [1, -1]) {
      const right = direction === 1,
        a = right ? x + bw - r : x + r,
        b = right ? x + bw : x,
        sweep = right ? 1 : 0;
      add(
        `M${x + bw / 2} ${y}H${a}A${r} ${r} 0 0 ${sweep} ${b} ${y + r}V${y + bh - r}A${r} ${r} 0 0 ${sweep} ${a} ${y + bh}H${x + bw / 2}`,
        `${id}-${direction}`,
        start,
        end,
      );
    }
  }
  const boxes: SceneBox[] = [{ x: 0, y: 0, width: w, height: h, start: 0.1 }];
  [
    [-margin, 0, w + margin, 0],
    [w, -margin, w, h + margin],
    [w + margin, h, -margin, h],
    [0, h + margin, 0, -margin],
  ].forEach(([x, y, a, b], i) =>
    add(
      `M${x} ${y}L${a} ${b}`,
      `guide${i}`,
      0.04 + i * 0.03,
      0.21 + i * 0.03,
      "frame",
    ),
  );
  halves(0, 0, w, h, skeleton.radius ?? 0, "outline", 0.1, 0.42);
  paths.slice(1).forEach((part, i) => {
    const sourceId = part.sourceId ?? part.id;
    const partIndex = skeleton.parts.findIndex((p) => p.id === sourceId);
    const start = 0.28 + (partIndex / Math.max(1, skeleton.parts.length - 1)) * 0.26,
      end = start + 0.2;
    const original = skeleton.parts.find((p) => p.id === sourceId);
    const { bounds: { x, y, width: bw, height: bh } } = pathGeometry(part.d);
    if (!part.sourceId || paths[i].sourceId !== part.sourceId) targets.push({
      ...(part.bounds ?? { x, y, width: bw, height: bh }),
      start,
    });
    const firstStroke = strokes.length;
    if (original?.kind === "rect") {
      halves(x, y, bw, bh, original.radius ?? 0, part.id, start, end);
      if (density >= 0.55) {
        boxes.push({ x, y, width: bw, height: bh, start });
        [
          [x - 16, y, x + bw + 16, y],
          [x + bw, y - 16, x + bw, y + bh + 16],
          [x + bw + 16, y + bh, x - 16, y + bh],
          [x, y + bh + 16, x, y - 16],
        ].forEach(([sx, sy, ex, ey], j) =>
          add(
            `M${sx} ${sy}L${ex} ${ey}`,
            `${part.id}-guide${j}`,
            start - 0.03 + j * 0.012,
            start + 0.07 + j * 0.012,
            "part",
          ),
        );
      }
    } else
      add(part.d, part.id, start, end, undefined, original?.kind === "line");
    for (let k = firstStroke; k < strokes.length; k++) {
      if (!strokes[k].guide) strokes[k].emphasis = part.emphasis;
    }
  });
  const outlines = strokes.filter((s) => s.id.startsWith("outline")),
    count = Math.round(44 * density);
  const flyers = Array.from({ length: count }, (_, i) => {
    const f =
        0.06 +
        (0.9 * Math.floor(i / 2)) / Math.max(1, Math.ceil(count / 2) - 1),
      outline = outlines[i % 2],
      to = pointAt(outline.points, f);
    let lo = 0,
      hi = 1;
    for (let j = 0; j < 26; j++) {
      const m = (lo + hi) / 2;
      if (drawEase(m) < f) lo = m;
      else hi = m;
    }
    const end = 0.1 + (0.32 * (lo + hi)) / 2,
      angle = seed(i * 9.1 + 1) * Math.PI * 2,
      dist = 30 + 70 * seed(i * 4.7 + 2);
    return {
      from: {
        x: to.x + Math.cos(angle) * dist,
        y: to.y + Math.sin(angle) * dist,
      },
      to,
      start: end - 0.09,
      end,
      seed: seed(i + 4),
    };
  });
  return {
    strokes,
    boxes,
    dots,
    maxDistance,
    flyers,
    margin,
    gap,
    density,
    targets,
  };
}
export function pointAt(points: Point[], t: number): Point {
  "worklet";
  const f = Math.max(0, Math.min(1, t)) * (points.length - 1),
    i = Math.min(points.length - 2, Math.floor(f)),
    q = f - i;
  return {
    x: points[i].x + (points[i + 1].x - points[i].x) * q,
    y: points[i].y + (points[i + 1].y - points[i].y) * q,
  };
}
