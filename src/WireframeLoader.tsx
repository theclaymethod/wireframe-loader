import { LoaderCore, type WireframeLoaderProps } from "./LoaderCore";
import { SvgWireframeCanvas } from "./SvgWireframeCanvas";
export { WireframePart } from "./LoaderCore";
export type { WireframeLoaderProps } from "./LoaderCore";

export function WireframeLoader(props: WireframeLoaderProps) {
  return <LoaderCore {...props} CanvasRenderer={SvgWireframeCanvas} />;
}
