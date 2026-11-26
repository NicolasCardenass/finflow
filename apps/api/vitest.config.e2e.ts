import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.e2e-spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/main.ts", "src/database/cli.ts"],
      // The build fails if coverage of the end-to-end suite drops below these values.
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    },
  },
});
