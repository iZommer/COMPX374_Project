/**
 * display-client/vitest.config.ts
 *
 * Purpose: Configures the display-client Vitest environment and test discovery.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
    coverage: { reporter: ["text", "html"] },
  },
});
