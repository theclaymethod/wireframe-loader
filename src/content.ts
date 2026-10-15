import { svgPathProperties } from "svg-path-properties";
import type { MeasuredBox, WireframePath } from "./geometry";

/** Describes expected content without supplying the eventual data. */
export type WireframeContent = (
  | { type: "number"; digits?: number; decimals?: number; treatment?: "dots" | "outline" | "gesture"; rowSpacing?: number }
  | { type: "text"; lines?: number; lineWidths?: readonly number[] }
  | { type: "chart"; variant?: "line" | "bars" | "waveform"; samples?: number; amplitude?: number; seed?: number }
  | { type: "image" }
) & {
  /** 0 preserves structured outlines; 1 gives loose, incomplete drafting marks. */
  abstraction?: number;
};

export interface WireframeContentPart extends MeasuredBox {
  id: string;
  kind: "content";
  content: WireframeContent;
}

function count(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  return value;
}
function fraction(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new Error(`${label} must be between 0 and 1.`);
  return value;
}

export function contentPaths(part: WireframeContentPart, box: MeasuredBox): WireframePath[] {
  const { x, y, width: w, height: h } = box;
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0)
    throw new Error("Content bounds must be finite with positive width and height.");
  const paths: string[] = [];
  const add = (d: string) => paths.push(d);
  const c = part.content;
  const abstraction = fraction(c.abstraction ?? 0.8, "Abstraction");
  if (c.type === "number") {
    const digits = count(c.digits ?? 2, 1, 12, "Digits");
    const decimals = count(c.decimals ?? 0, 0, 6, "Decimals");
    const slots = digits + decimals;
    const cell = w / (slots + (decimals ? 0.3 : 0));
    for (let i = 0; i < slots; i++) {
      const left = x + (i + (decimals && i >= digits ? 0.3 : 0)) * cell;
      if ((c.treatment ?? "dots") === "dots") {
        const spacing = c.rowSpacing ?? 4;
        if (!Number.isFinite(spacing) || spacing < 2 || spacing > 16)
          throw new Error("Number rowSpacing must be between 2 and 16.");
        const rows = Math.max(2, Math.ceil(h / spacing));
        for (let row = 0; row < rows; row++) {
          const py = y + ((row + 0.5) / rows) * h;
          add(`M${left + cell * 0.12} ${py}H${left + cell * 0.82}`);
        }
        continue;
      }
      const gesture = c.treatment === "outline" ? 0 : abstraction;
      const point = (u: number, v: number, looseU: number, looseV: number) =>
        `${left + cell * (u + (looseU - u) * gesture)} ${y + h * (v + (looseV - v) * gesture)}`;
      // Gesture fragments suggest the space a value will occupy, never a glyph.
      add(`M${point(0.25, 0.15, 0.18, 0.26)}L${point(0.7, 0.15, 0.66, 0.12)}`);
      add(`M${point(0.12, 0.28, 0.12, 0.48)}L${point(0.12, 0.85, 0.38, 0.6)}L${point(0.48, 0.85, 0.72, 0.48)}`);
      add(`M${point(0.82, 0.15, 0.45, 0.76)}L${point(0.82, 0.7, 0.76, 0.9)}`);
    }
    if (decimals) add(`M${x + digits * cell} ${y + h * 0.85}h${cell * 0.08}`);
  } else if (c.type === "text") {
    const lines = count(c.lines ?? c.lineWidths?.length ?? 1, 1, 8, "Text lines");
    if (c.lineWidths && c.lineWidths.length !== lines)
      throw new Error("lineWidths must contain one fraction per text line.");
    for (let i = 0; i < lines; i++) {
      const width = fraction(c.lineWidths?.[i] ?? (i === lines - 1 && lines > 1 ? 0.65 : 1), "Line width");
      if (width > 0) add(`M${x} ${y + ((i + 0.56) / lines) * h}h${w * width}`);
    }
  } else if (c.type === "chart") {
    const n = count(c.samples ?? 16, 3, 48, "Chart samples");
    const amplitude = fraction(c.amplitude ?? 0.7, "Chart amplitude");
    const seed = c.seed ?? 1;
    if (!Number.isFinite(seed)) throw new Error("Chart seed must be finite.");
    const wave = (i: number) => Math.sin(i * 1.73 + seed) * 0.65 + Math.sin(i * 0.61 + seed * 0.7) * 0.35;
    if (c.variant === "bars") {
      if (amplitude === 0) return [];
      for (let i = 0; i < n; i++) {
        const bx = x + ((i + 0.5) / n) * w;
        add(`M${bx} ${y + h}V${y + h * (1 - (0.15 + (wave(i) + 1) * 0.425) * amplitude)}`);
      }
    } else {
      const points = Array.from({ length: n }, (_, i) => {
        const value = c.variant === "waveform" ? wave(i) : wave(i) * 0.5 + (i / (n - 1) - 0.5) * 0.8;
        return { x: x + (i / (n - 1)) * w, y: y + h * (0.5 - value * amplitude * 0.45) };
      });
      if (abstraction < 0.35) {
        add(points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(""));
      } else {
        // Incomplete curved gestures convey chart-like motion without a fake series.
        const step = abstraction >= 0.7 ? 5 : 4;
        for (let i = 0; i + 2 < n; i += step) {
          const a = points[i], b = points[i + 1], c = points[i + 2], d = points[Math.min(i + 3, n - 1)];
          add(`M${a.x} ${a.y}C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`);
        }
      }
    }
  } else {
    add(`M${x} ${y + h}L${x + w * 0.35} ${y + h * 0.48}L${x + w * 0.58} ${y + h * 0.72}L${x + w * 0.77} ${y + h * 0.38}L${x + w} ${y + h * 0.68}`);
    const r = Math.min(w, h) * 0.08;
    add(`M${x + w * 0.3 + r} ${y + h * 0.25}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0`);
  }
  return paths.map((d, i) => ({
    id: `${part.id}:${i}`, sourceId: part.id, d,
    length: new svgPathProperties(d).getTotalLength(), bounds: box,
  }));
}
