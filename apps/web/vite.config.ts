import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./", // serve relative paths when previewing static files
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4300",
    },
  },
  build: {
    outDir: "../dist/web",
  },
});
