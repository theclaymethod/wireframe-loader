import { Text, View } from "react-native";
import {
  SkiaWireframeLoader,
  WireframePart,
  wireframePresets,
  type WireframeSkeleton,
} from "../src/skia";

const skeleton: WireframeSkeleton = {
  width: 332,
  height: 160,
  radius: 20,
  parts: [
    {
      id: "title", kind: "content", x: 24, y: 24, width: 200, height: 24,
      content: { type: "text", lines: 1 },
    },
    {
      id: "reading", kind: "content", x: 24, y: 66, width: 96, height: 44,
      content: { type: "number", digits: 3 },
      emphasis: { contrast: 1.5, dotSpacing: 4 },
    },
    {
      id: "detail", kind: "content", x: 24, y: 122, width: 230, height: 16,
      content: { type: "text", lines: 1 },
    },
  ],
};

type CardData = { title: string; value: string; detail: string };

export function IntegrationCard({ loading, data }: {
  loading: boolean;
  data?: CardData | null;
}) {
  return (
    <SkiaWireframeLoader
      loading={loading || !data}
      skeleton={skeleton}
      {...wireframePresets.default}
      style={{ width: 332, height: 160 }}
      loadingLabel="Loading summary"
    >
      {data && (
        <View style={{ width: 332, height: 160, borderRadius: 20, backgroundColor: "white" }}>
          <WireframePart id="title" style={{ position: "absolute", left: 24, top: 24 }}>
            <Text style={{ fontSize: 18, lineHeight: 24, color: "#292929" }}>{data.title}</Text>
          </WireframePart>
          <WireframePart id="reading" style={{ position: "absolute", left: 24, top: 66 }}>
            <Text style={{ fontSize: 36, lineHeight: 44, color: "#292929" }}>{data.value}</Text>
          </WireframePart>
          <WireframePart id="detail" style={{ position: "absolute", left: 24, top: 122 }}>
            <Text style={{ fontSize: 13, lineHeight: 16, color: "#626262" }}>{data.detail}</Text>
          </WireframePart>
        </View>
      )}
    </SkiaWireframeLoader>
  );
}
