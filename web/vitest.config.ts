import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default defineConfig(async ({ mode }) => {
  const resolvedViteConfig = await viteConfig({ mode, command: "serve" });

  return mergeConfig(resolvedViteConfig, {
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
    },
  });
});
