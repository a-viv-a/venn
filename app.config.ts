import { defineConfig } from "@solidjs/start/config";
import wasmModuleWorkers from "vite-plugin-wasm-module-workers";

export default defineConfig({
  server: {
    preset: "cloudflare-pages",

    rollupConfig: {
      external: ["node:async_hooks"]
    },

    experimental: {
      wasm: true
    },

    plugins: [
      // @ts-expect-error
      wasmModuleWorkers()
    ]
  }
});
