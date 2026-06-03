import axios, { type AxiosError, type AxiosInstance } from "axios";
import { ADMIN_AUTH_STORAGE_KEYS } from "@growing/admin-shell";
import { envConfig } from "@/config/env";
import type {
  ApiError,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types/auth";
import { clearTokens, getAccessToken, getRefreshToken } from "@/utils/token";

class AuthApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: envConfig.apiUrl,
      timeout: envConfig.apiTimeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as
          | (typeof error.config & { _retry?: boolean })
          | undefined;
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshToken();
            const token = getAccessToken();
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.api(originalRequest);
          } catch {
            clearTokens();
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      },
    );
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>("/auth/login", {
      identifier: credentials.identifier,
      password: credentials.password,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      clearTokens();
    }
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token");
    }
    const response = await this.api.post<RefreshTokenResponse>("/auth/refresh", {
      refreshToken,
    } satisfies RefreshTokenRequest);
    localStorage.setItem(
      ADMIN_AUTH_STORAGE_KEYS.ACCESS_TOKEN,
      response.data.accessToken,
    );
    localStorage.setItem(
      ADMIN_AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT,
      String(response.data.expiresAt),
    );
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get("/auth/me");
    return response.data;
  }

  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      return {
        message:
          (response?.data as { message?: string })?.message ||
          error.message ||
          "Ошибка запроса",
        statusCode: response?.status,
      };
    }
    return {
      message: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
  }

  wrap<T>(promise: Promise<T>): Promise<T> {
    return promise.catch((error) => {
      throw this.handleError(error);
    });
  }
}

export const authApi = new AuthApiService();
