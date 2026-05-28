import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "src/cartRules.js",
        "src/promotionRules.js",
        "src/rawgMapper.js",
        "src/serializers.js",
        "src/errors.js"
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  }
});
