import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-form": ["react-hook-form", "zod", "@hookform/resolvers"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      // Dev proxy -> backend-nestjs chạy ở :3000 (xem README.md backend-nestjs)
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
