import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Added so tests can import modules that use the `@/` alias. Everything under
 * src/ uses it, and without this the only testable files were the two that
 * happened to import purely relatively.
 *
 * `server-only` is stubbed for the same reason: it is a build-time guard that
 * throws outside a React Server Component, and lib/categories/data.ts pulls it
 * in for that guard alone.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
