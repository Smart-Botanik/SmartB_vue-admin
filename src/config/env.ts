export interface EnvConfig {
  apiUrl: string;
  apiTimeout: number;
  appName: string;
  /** External icon catalog base URL (icons-hub). */
  iconCatalogUrl: string;
  /** Axios timeout for icons-hub (Puppeteer scrape can be slow). */
  iconCatalogTimeout: number;
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

function resolveIconCatalogUrl(): string {
  const fromEnv = (import.meta.env.VITE_ICON_CATALOG_URL || "").trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:3020/api/v1";
  }
  return "";
}

/** Default 90s — Flaticon Puppeteer scrape often exceeds the 10s Nest/BFF timeout. */
function resolveIconCatalogTimeout(): number {
  const raw = Number(import.meta.env.VITE_ICON_CATALOG_TIMEOUT);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  return 90_000;
}

export const envConfig: EnvConfig = {
  apiUrl: resolveApiUrl(),
  apiTimeout: 10000,
  appName: import.meta.env.VITE_APP_NAME || "SmartБотанik Admin (Vue)",
  iconCatalogUrl: resolveIconCatalogUrl(),
  iconCatalogTimeout: resolveIconCatalogTimeout(),
};
