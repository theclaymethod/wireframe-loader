import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
// Skia detects optional Metro dependencies with require() inside ESM files.
// Make those imports explicit for the browser preview and dependency optimizer.
function skiaWebIntegration() {
  return {
    name: "skia-web-optional-dependencies",
    enforce: "pre",
    transform(code, id) {
      if (
        !id.includes("@shopify/react-native-skia/") ||
        !/(renderHelpers|ReanimatedProxy)\.js$/.test(id)
      )
        return;
      const version = JSON.parse(
        readFileSync(
          new URL(
            "./node_modules/react-native-reanimated/package.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ).version;
      return {
        code:
          `import * as WebReanimated from 'react-native-reanimated';import * as WebWorklets from 'react-native-worklets';\n` +
          code
            .replaceAll(
              'require("react-native-reanimated/package.json").version',
              JSON.stringify(version),
            )
            .replaceAll('require("react-native-reanimated")', "WebReanimated")
            .replaceAll('require("react-native-worklets")', "WebWorklets"),
        map: null,
      };
    },
  };
}
export default defineConfig(({ mode }) => ({
  plugins: [skiaWebIntegration(), react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^react-native$/, replacement: "react-native-web" },
      {
        find: /^react-native-svg$/,
        replacement: new URL(
          "./node_modules/react-native-svg/lib/module/elements.web.js",
          import.meta.url,
        ).pathname,
      },
    ],
    extensions: [
      ".web.mjs",
      ".mjs",
      ".web.js",
      ".js",
      ".web.ts",
      ".ts",
      ".web.tsx",
      ".tsx",
      ".json",
    ],
  },
  build: {
    rolldownOptions: {
      resolve: {
        extensions: [".web.js", ".js", ".web.ts", ".ts", ".tsx", ".json"],
      },
    },
  },
  define: {
    __DEV__: JSON.stringify(mode !== "production"),
    global: "globalThis",
    "process.env.NODE_ENV": JSON.stringify(
      mode === "production" ? "production" : "development",
    ),
  },
  optimizeDeps: {
    rolldownOptions: {
      plugins: [skiaWebIntegration()],
      resolve: {
        extensions: [".web.js", ".js", ".web.ts", ".ts", ".tsx", ".json"],
      },
    },
    include: [
      "@shopify/react-native-skia",
      "react-reconciler",
      "react-reconciler/constants",
      "react",
      "react-dom/client",
      "react-native-web",
      "react-native-reanimated",
      "react-native-worklets",
      "react-native-svg",
    ],
  },
}));
