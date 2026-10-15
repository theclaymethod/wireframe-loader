import { createRoot } from "react-dom/client";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit";
import canvasKit from "canvaskit-wasm/bin/full/canvaskit.wasm?url";
// CanvasKit must exist before importing the shared native example on web.
CanvasKitInit({ locateFile: () => canvasKit })
  .then(async (kit) => {
    Object.assign(globalThis, { CanvasKit: kit });
    const { default: App } = await import("./App");
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch((error) => {
    console.error(error);
    document.getElementById("root")!.textContent =
      "The Skia preview could not start. Reload to retry.";
  });
