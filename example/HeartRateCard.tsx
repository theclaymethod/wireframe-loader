import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { WireframeSkeleton, WireframeEmphasis } from "../src";
const ecg =
  "M16 190H62L69 190L76 162L83 212L90 190L97 194L104 190H154L161 190L168 162L175 212L182 190L189 194L196 190H246L253 190L260 162L267 212L274 190L281 194L288 190H316";
export const heartEmphasis: WireframeEmphasis = {
  reading: { contrast: 2, strokeWidth: 2.4, dotSpacing: 4 },
  unit: { contrast: 1.25 },
  pulse: { contrast: 2, color: "#ec4a4a" },
};
export const heartSkeleton: WireframeSkeleton = {
  width: 332,
  height: 344.5,
  radius: 24,
  parts: [
    {
      id: "back",
      kind: "rect",
      x: 16,
      y: 16,
      width: 32,
      height: 32,
      radius: 16,
    },
    {
      id: "chevron",
      kind: "path",
      d: "M33.53033 28.46967C33.82322 28.76256 33.82322 29.23744 33.53033 29.53033L31.06066 32.00000L33.53033 34.46970C33.82322 34.76260 33.82322 35.23740 33.53033 35.53030C33.23744 35.82320 32.76256 35.82320 32.46967 35.53030L29.46970 32.53033C29.17680 32.23744 29.17680 31.76256 29.46970 31.46967L32.46967 28.46967C32.76256 28.17678 33.23744 28.17678 33.53033 28.46967Z",
      length: 15,
    },
    { id: "heading", kind: "line", x: 135.21, y: 32.68, width: 61.58 },
    {
      id: "menu",
      kind: "rect",
      x: 284,
      y: 16,
      width: 32,
      height: 32,
      radius: 16,
    },
    {
      id: "menu-dots",
      kind: "path",
      d: "M296.5 32a.5 .5 0 1 1-1 0a.5 .5 0 0 1 1 0ZM300.5 32a.5 .5 0 1 1-1 0a.5 .5 0 0 1 1 0ZM304.5 32a.5 .5 0 1 1-1 0a.5 .5 0 0 1 1 0Z",
      length: 0.3,
    },
    {
      id: "reading", kind: "content",
      x: 107, y: 76, width: 77, height: 44,
      content: { type: "number", digits: 2, treatment: "dots", rowSpacing: 4 },
    },
    {
      height: 22,
      id: "unit",
      kind: "content",
      content: { type: "text" },
      x: 191.98,
      y: 104,
      width: 33.38,
    },
    { id: "pulse", kind: "content", x: 16, y: 162, width: 300, height: 50,
      content: { type: "chart", variant: "waveform", samples: 32, amplitude: 0.75, seed: 7, abstraction: 1 } },
    { id: "section", kind: "line", x: 24, y: 265.92, width: 104.14 },
    ...[24, 121.33, 218.66].flatMap((x, i) => [
      {
        id: `label${i}`,
        kind: "line" as const,
        x,
        y: 292.62,
        width: [42.9, 46.58, 24.14][i],
      },
      { id: `value${i}`, kind: "line" as const, x, y: 310.68, width: 23.84 },
      {
        id: `unit${i}`,
        kind: "line" as const,
        x: x + 23.84,
        y: 311.12,
        width: 42.12,
      },
    ]),
  ],
};
export function HeartRateCard({ onOpen }: { onOpen: () => void }) {
  return (
    <View
      style={{
        width: "100%",
        height: 344.5,
        borderRadius: 24,
        backgroundColor: "#fcfcfa",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onOpen}
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#e8e8e6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22, color: "#333" }}>‹</Text>
      </Pressable>
      <Text
        style={{
          position: "absolute",
          left: 135,
          top: 22,
          fontSize: 13,
          lineHeight: 20,
          color: "#6c6c6c",
        }}
      >
        Heart rate
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Heart rate details"
        onPress={onOpen}
        style={{
          position: "absolute",
          left: 284,
          top: 16,
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#e8e8e6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 16, color: "#333" }}>···</Text>
      </Pressable>
      <Text
        style={{
          position: "absolute",
          left: 107,
          top: 64,
          fontSize: 60,
          lineHeight: 70,
          fontWeight: "500",
          color: "#0d0d0d",
        }}
      >
        72
      </Text>
      <Text
        style={{
          position: "absolute",
          left: 192,
          top: 104,
          fontSize: 16,
          lineHeight: 22,
          color: "#6c6c6c",
        }}
      >
        bpm
      </Text>
      <View
        style={{
          position: "absolute",
          left: 16,
          top: 142,
          width: 300,
          height: 96,
          borderRadius: 12,
          backgroundColor: "#f5f5f3",
        }}
      />
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }}>
      <Svg
        width={332}
        height={344}
        style={{ position: "absolute" }}
        pointerEvents="none"
      >
        <Path
          d={ecg}
          fill="none"
          stroke="#ec4a4a"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      </View>
      <Text
        style={{
          position: "absolute",
          left: 24,
          top: 254,
          fontSize: 16,
          lineHeight: 22,
          fontWeight: "500",
          color: "#0d0d0d",
        }}
      >
        Core strength
      </Text>
      {["Current", "Average", "Max"].map((label, i) => (
        <View
          key={label}
          style={{ position: "absolute", left: [24, 121, 219][i], top: 284 }}
        >
          <Text style={{ fontSize: 12, lineHeight: 16, color: "#6c6c6c" }}>
            {label}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 20, color: "#333" }}>
            {["1.6", "2.2", "4.2"][i]} sec/sqt
          </Text>
        </View>
      ))}
    </View>
  );
}
