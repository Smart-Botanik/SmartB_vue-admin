import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@growing/admin-shell": path.resolve(
          __dirname,
          "../packages/admin-shell/src/index.ts",
        ),
      },
    },
    server: {
      port: 5175,
      host: true,
      cors: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
        "/graphql": {
          target: env.VITE_API_URL || "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      target: "es2020",
      outDir: "dist",
      sourcemap: mode === "development",
    },
  };
});
