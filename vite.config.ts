import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

/** Avoid Node resolving `localhost` to IPv6 `::1` when Nest listens on IPv4 only. */
function resolveProxyTarget(raw?: string): string {
  const value = raw?.trim() || "http://127.0.0.1:3001";
  return value.replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = resolveProxyTarget(env.VITE_API_URL);

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@growing/admin-shell": path.resolve(
          __dirname,
          "../packages/admin-shell/src/index.ts",
        ),
        "@growing/content-markdown": path.resolve(
          __dirname,
          "../packages/content-markdown/src/index.ts",
        ),
        "@growing/contracts": path.resolve(__dirname, "../packages/contracts/src/index.ts"),
      },
    },
    server: {
      port: 5175,
      host: true,
      cors: true,
      proxy: {
        "/auth": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/graphql": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/media": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: apiTarget,
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
