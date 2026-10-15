import { contentPaths, type WireframeContentPart } from "./content";
export type { WireframeContent, WireframeContentPart } from "./content";

type WireframeGeometry =
  | {
      id: string;
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
    }
  | { id: string; kind: "circle"; x: number; y: number; radius: number }
  | {
      id: string;
      kind: "line";
      x: number;
      y: number;
      width: number;
      height?: number;
    }
  | { id: string; kind: "path"; d: string; length: number };

export type WireframePartShape = (WireframeGeometry | WireframeContentPart) & {
  emphasis?: WireframePartEmphasis;
};

/** Points are in the same logical coordinate space as the component design. */
export interface WireframeSkeleton {
  width: number;
  height: number;
  radius?: number;
  parts: readonly WireframePartShape[];
}
export interface MeasuredBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface WireframePartEmphasis {
  /** Overrides inherited contrast (0–3). Global contrast 0 still hides all ink. */
  contrast?: number;
  color?: string;
  /** Trace width in design points (0.5–6). */
  strokeWidth?: number;
  /** Spacing between dots in design points (2–16). */
  dotSpacing?: number;
}
export type WireframeEmphasis = Readonly<Record<string, WireframePartEmphasis>>;

export interface WireframePath {
  sourceId?: string;
  emphasis?: WireframePartEmphasis;
  id: string;
  d: string;
  length: number;
  bounds?: MeasuredBox;
}

function positive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${name} must be positive and finite.`);
}
function finite(values: number[]) {
  if (!values.every(Number.isFinite))
    throw new Error("Wireframe coordinates must be finite.");
}
function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0,
) {
  positive(width, "width");
  positive(height, "height");
  finite([x, y, radius]);
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  return {
    d: `M${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height - r}Q${x + width} ${y + height} ${x + width - r} ${y + height}H${x + r}Q${x} ${y + height} ${x} ${y + height - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`,
    // A conservative dash length also covers the quadratic corners completely.
    length: 2 * (width + height),
  };
}
export function compileWireframe(
  skeleton: WireframeSkeleton,
  measured: ReadonlyMap<string, MeasuredBox> = new Map(),
  emphasis: WireframeEmphasis = {},
): WireframePath[] {
  positive(skeleton.width, "Skeleton width");
  positive(skeleton.height, "Skeleton height");
  if (skeleton.parts.length > 32)
    throw new Error("Use at most 32 wireframe parts per loader.");
  const validateEmphasis = (value: WireframePartEmphasis) => {
    for (const [key, min, max] of [["contrast", 0, 3], ["strokeWidth", 0.5, 6], ["dotSpacing", 2, 16]] as const) {
      const v = value[key];
      if (v !== undefined && (!Number.isFinite(v) || v < min || v > max))
        throw new Error(`Element ${key} must be between ${min} and ${max}.`);
    }
  };
  Object.values(emphasis).forEach(validateEmphasis);
  const ids = new Set<string>();
  const parts = skeleton.parts.map((part) => {
    if (!part.id || ids.has(part.id) || part.id === "__outline")
      throw new Error("Wireframe part IDs must be unique and nonempty.");
    ids.add(part.id);
    if (part.emphasis) validateEmphasis(part.emphasis);
    const box = measured.get(part.id);
    if (part.kind === "content") return contentPaths(part, box ?? part);
    if (part.kind === "path") {
      positive(part.length, "Path length");
      if (!part.d.trim()) throw new Error("Path data must be nonempty.");
      return part;
    }
    if (part.kind === "rect")
      return {
        id: part.id,
        ...roundedRect(
          box?.x ?? part.x,
          box?.y ?? part.y,
          box?.width ?? part.width,
          box?.height ?? part.height,
          part.radius,
        ),
      };
    if (part.kind === "line") {
      const x = box?.x ?? part.x,
        y = box ? box.y + box.height * 0.56 : part.y,
        w = box?.width ?? part.width;
      finite([x, y]);
      positive(w, "Line width");
      const textHeight = box?.height ?? part.height ?? 16;
      positive(textHeight, "Text height");
      return {
        id: part.id,
        d: `M${x} ${y}h${w}`,
        length: w,
        bounds: {
          x,
          y: box?.y ?? y - textHeight * 0.56,
          width: w,
          height: textHeight,
        },
      };
    }
    const r = box ? Math.min(box.width, box.height) / 2 : part.radius,
      x = box ? box.x + box.width / 2 : part.x,
      y = box ? box.y + box.height / 2 : part.y;
    positive(r, "Circle radius");
    finite([x, y]);
    return {
      id: part.id,
      d: `M${x + r} ${y}a${r} ${r} 0 1 0 ${-r * 2} 0a${r} ${r} 0 1 0 ${r * 2} 0`,
      length: Math.PI * r * 2,
    };
  });
  return [
    {
      id: "__outline",
      ...roundedRect(
        1,
        1,
        skeleton.width - 2,
        skeleton.height - 2,
        skeleton.radius,
      ),
    },
    ...parts.flat().map((part) => {
      const id = "sourceId" in part ? part.sourceId! : part.id;
      const inline = skeleton.parts.find((p) => p.id === id)?.emphasis;
      return { ...part, emphasis: { ...inline, ...emphasis[id] } };
    }),
  ];
}
