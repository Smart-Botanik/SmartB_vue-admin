export interface EnvConfig {
  apiUrl: string;
  apiTimeout: number;
  appName: string;
}

export const envConfig: EnvConfig = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3001",
  apiTimeout: 10000,
  appName: import.meta.env.VITE_APP_NAME || "SmartБотаник Admin (Vue)",
};
