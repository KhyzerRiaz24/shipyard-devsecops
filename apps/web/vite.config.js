// Browser /api requests go to the API in development; nginx.conf does this in Docker.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  // Project Pages uses /repository-name/; Docker and normal development use /.
  base:
    process.env.BASE_PATH || (mode === "demo" ? "/shipyard-devsecops/" : "/"),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/health": "http://127.0.0.1:4000",
    },
  },
  test: {
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/**/*.test.{js,jsx}", "src/test-setup.js", "src/main.jsx"],
    },
    environment: "jsdom",
    setupFiles: "./src/test-setup.js",
    include: ["src/**/*.test.{js,jsx}"],
  },
}));
