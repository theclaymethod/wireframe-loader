import { svgPathProperties } from "svg-path-properties";

// Bounded across mounts: repeated retries reuse immutable geometry without retaining
// every blueprint ever displayed by the application.
const cache = new Map<string, ReturnType<typeof measure>>();
function measure(d: string) {
  const geometry = new svgPathProperties(d);
  const length = geometry.getTotalLength();
  const straight = /^M\s*[-\d.e+,\s]+[hHvV]\s*[-\d.e+,\s]+$/.test(d);
  const count = straight ? 2 : Math.max(8, Math.min(193, Math.ceil(length / 3) + 1));
  const points = Array.from({ length: count }, (_, i) => geometry.getPointAtLength(i * length / (count - 1)));
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { length, points, bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y } };
}
export function pathGeometry(d: string) {
  const hit = cache.get(d);
  if (hit) return hit;
  const result = measure(d);
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(d, result);
  return result;
}
