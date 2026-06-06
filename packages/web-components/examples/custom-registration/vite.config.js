import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        default: resolve(__dirname, "default.html"),
        define: resolve(__dirname, "define.html"),
        "custom-name": resolve(__dirname, "custom-name.html"),
        scoped: resolve(__dirname, "scoped.html"),
        prefix: resolve(__dirname, "prefix.html"),
      },
    },
  },
});
