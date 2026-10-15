import { Easing, interpolateColor } from "react-native-reanimated";
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1).factory();
export const drawEase = Easing.bezier(0.16, 1, 0.3, 1).factory();
export function windowProgress(value: number, start: number, end: number) {
  "worklet";
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}
export function smooth(start: number, end: number, value: number) {
  "worklet";
  const q = windowProgress(value, start, end);
  return q * q * (3 - 2 * q);
}

export function contrastInk(color: string, fieldColor: string, contrast: number) {
  return contrast <= 1 ? color : interpolateColor(contrast, [1, 3], [color, fieldColor]);
}
