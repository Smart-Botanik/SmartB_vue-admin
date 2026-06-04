export interface EnvConfig {
  apiUrl: string;
  apiTimeout: number;
  appName: string;
}

/**
 * In dev, use same-origin requests so Vite proxy handles API (no CORS).
 * `VITE_API_URL` is still used as the proxy target in vite.config.ts.
 */
function resolveApiUrl(): string {
  if (import.meta.env.DEV) {
    return "";
  }
  return import.meta.env.VITE_API_URL || "http://localhost:3001";
}

export const envConfig: EnvConfig = {
  apiUrl: resolveApiUrl(),
  apiTimeout: 10000,
  appName: import.meta.env.VITE_APP_NAME || "SmartБотанik Admin (Vue)",
};
