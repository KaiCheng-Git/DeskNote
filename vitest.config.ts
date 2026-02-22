import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the $lib alias SvelteKit provides
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/__tests__/**", "src/lib/**/*.{test,spec}.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
