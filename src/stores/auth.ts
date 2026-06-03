import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ADMIN_AUTH_STORAGE_KEYS } from "@growing/admin-shell";
import { authApi } from "@/services/auth";
import type { LoginRequest, User } from "@/types/auth";
import {
  clearTokens,
  getStoredTokens,
  isTokenValid,
  parseToken,
  storeTokens,
} from "@/utils/token";
import type { AuthTokens } from "@/types/auth";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const tokens = ref<AuthTokens | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value && tokens.value));

  function clearError() {
    error.value = null;
  }

  async function hydrateFromStorage() {
    const stored = getStoredTokens();
    if (!stored || !isTokenValid(stored.accessToken)) {
      clearTokens();
      user.value = null;
      tokens.value = null;
      return;
    }

    tokens.value = stored;
    const rawUser = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.USER_DATA);
    if (rawUser) {
      try {
        user.value = JSON.parse(rawUser) as User;
      } catch {
        user.value = null;
      }
    }

    try {
      const freshUser = await authApi.wrap(authApi.getCurrentUser());
      const payload = parseToken(stored.accessToken);
      const userWithRole: User = {
        ...freshUser,
        role: freshUser?.role ?? payload?.role,
      };
      user.value = userWithRole;
      localStorage.setItem(
        ADMIN_AUTH_STORAGE_KEYS.USER_DATA,
        JSON.stringify(userWithRole),
      );
    } catch {
      clearTokens();
      user.value = null;
      tokens.value = null;
      error.value = "Сессия истекла. Войдите снова.";
    }
  }

  async function initialize() {
    if (initialized.value) {
      return;
    }
    loading.value = true;
    await hydrateFromStorage();
    loading.value = false;
    initialized.value = true;
  }

  async function login(credentials: LoginRequest) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authApi.wrap(authApi.login(credentials));
      if (!response?.jwt) {
        throw new Error("Некорректный ответ: нет JWT");
      }
      const payload = parseToken(response.jwt);
      if (!payload) {
        throw new Error("Некорректный формат JWT");
      }
      const nextTokens: AuthTokens = {
        accessToken: response.jwt,
        refreshToken: response.jwt,
        expiresAt: payload.exp * 1000,
      };
      storeTokens(nextTokens);
      tokens.value = nextTokens;

      if (!response.user) {
        throw new Error("Некорректный ответ: нет данных пользователя");
      }
      const userWithRole: User = {
        ...response.user,
        role: response.user.role ?? payload.role,
      };
      user.value = userWithRole;
      localStorage.setItem(
        ADMIN_AUTH_STORAGE_KEYS.USER_DATA,
        JSON.stringify(userWithRole),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось войти";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    await authApi.logout();
    clearTokens();
    user.value = null;
    tokens.value = null;
    error.value = null;
  }

  return {
    user,
    tokens,
    loading,
    error,
    initialized,
    isAuthenticated,
    clearError,
    initialize,
    login,
    logout,
  };
});
