import { ADMIN_AUTH_STORAGE_KEYS } from "@growing/admin-shell";
import type { AuthTokens, JwtPayload } from "@/types/auth";

export function parseToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(atob(parts[1])) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  const payload = parseToken(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 > Date.now();
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.REFRESH_TOKEN);
}

export function getStoredTokens(): AuthTokens | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const expiresRaw = localStorage.getItem(
    ADMIN_AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT,
  );
  if (!accessToken || !refreshToken || !expiresRaw) {
    return null;
  }
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) {
    return null;
  }
  return { accessToken, refreshToken, expiresAt };
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  localStorage.setItem(
    ADMIN_AUTH_STORAGE_KEYS.REFRESH_TOKEN,
    tokens.refreshToken,
  );
  localStorage.setItem(
    ADMIN_AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT,
    String(tokens.expiresAt),
  );
}

export function clearTokens(): void {
  localStorage.removeItem(ADMIN_AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(ADMIN_AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(ADMIN_AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT);
  localStorage.removeItem(ADMIN_AUTH_STORAGE_KEYS.USER_DATA);
}
