import { ADMIN_AUTH_STORAGE_KEYS } from "@growing/admin-shell";

export { ADMIN_AUTH_STORAGE_KEYS as STORAGE_KEYS };

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: "ADMIN" | "USER" | "admin" | "user" | string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  jwt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresAt: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
}
