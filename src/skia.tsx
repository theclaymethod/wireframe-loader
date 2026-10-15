import { LoaderCore, type WireframeLoaderProps } from "./LoaderCore";
import { SkiaWireframeCanvas } from "./SkiaWireframeCanvas";
export { WireframePart } from "./LoaderCore";
export type { WireframeLoaderProps } from "./LoaderCore";
export type { WireframeSkeleton, WireframePartShape, WireframeEmphasis, WireframePartEmphasis, WireframeContent, WireframeContentPart } from "./geometry";
export function SkiaWireframeLoader(props: WireframeLoaderProps) {
  return <LoaderCore {...props} CanvasRenderer={SkiaWireframeCanvas} />;
}

export { wireframePresets } from "./presets";
