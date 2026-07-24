import axios, { type AxiosError } from "axios";
import {
  ICON_CATALOG_SEARCH_DEFAULTS,
  PNG_ICON_MIME,
  buildOffsetPaginationMeta,
  looksLikePng,
  normalizeIconSearchQuery,
  normalizeOffsetPagination,
  suggestedPngFileName,
  type IconCatalogError,
  type IconCatalogItem,
  type IconSearchInput,
  type IconSearchResult,
  type PngIconDownloadResult,
} from "@growing/contracts";

import { envConfig } from "@/config/env";
import { getAccessToken } from "@/utils/token";

/**
 * External icon catalog (icons-hub).
 * - GET  {base}/icons/search?q&offset&limit → { items, page }
 * - GET  {base}/icons/:id/download-png → { id, title, fileName, mimeType, downloadUrl }
 *
 * Set `VITE_ICON_CATALOG_URL` (dev default: http://127.0.0.1:3020/api/v1).
 */

export class IconCatalogApiError extends Error {
  readonly code: IconCatalogError["code"];
  readonly status?: number;

  constructor(error: IconCatalogError) {
    super(error.message);
    this.name = "IconCatalogApiError";
    this.code = error.code;
    this.status = error.status;
  }
}

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function catalogBaseUrl(): string {
  return envConfig.iconCatalogUrl.replace(/\/$/, "");
}

function ensureConfigured(): string {
  const base = catalogBaseUrl();
  if (!base) {
    throw new IconCatalogApiError({
      code: "UPSTREAM_ERROR",
      message: "Каталог иконок не настроен (VITE_ICON_CATALOG_URL)",
    });
  }
  return base;
}

function toCatalogError(error: unknown): IconCatalogApiError {
  if (error instanceof IconCatalogApiError) {
    return error;
  }

  if (
    (error instanceof Error && error.name === "CanceledError") ||
    (typeof error === "object" &&
      error != null &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_CANCELED")
  ) {
    return new IconCatalogApiError({
      code: "NETWORK",
      message: "",
    });
  }

  const ax = error as AxiosError<{ message?: string; code?: string }>;
  if (axios.isAxiosError(ax)) {
    const status = ax.response?.status;
    const upstreamMessage = ax.response?.data?.message;

    if (ax.code === "ERR_CANCELED") {
      return new IconCatalogApiError({
        code: "NETWORK",
        message: "",
      });
    }

    if (ax.code === "ECONNABORTED" || ax.message.includes("timeout")) {
      return new IconCatalogApiError({
        code: "NETWORK",
        message: "Таймаут запроса к каталогу иконок",
        status,
      });
    }
    if (!ax.response) {
      return new IconCatalogApiError({
        code: "NETWORK",
        message: "Нет соединения с каталогом иконок",
      });
    }
    if (status === 401) {
      return new IconCatalogApiError({
        code: "UNAUTHORIZED",
        message: upstreamMessage || "Требуется авторизация",
        status,
      });
    }
    if (status === 403) {
      return new IconCatalogApiError({
        code: "FORBIDDEN",
        message: upstreamMessage || "Нет доступа к каталогу иконок",
        status,
      });
    }
    if (status === 404) {
      return new IconCatalogApiError({
        code: "NOT_FOUND",
        message: upstreamMessage || "Иконка не найдена",
        status,
      });
    }
    if (status === 429) {
      return new IconCatalogApiError({
        code: "RATE_LIMITED",
        message: upstreamMessage || "Слишком много запросов — подождите",
        status,
      });
    }
    return new IconCatalogApiError({
      code: "UPSTREAM_ERROR",
      message: upstreamMessage || "Ошибка каталога иконок",
      status,
    });
  }

  if (error instanceof Error) {
    return new IconCatalogApiError({
      code: "UPSTREAM_ERROR",
      message: error.message,
    });
  }

  return new IconCatalogApiError({
    code: "UPSTREAM_ERROR",
    message: "Неизвестная ошибка каталога иконок",
  });
}

type UpstreamSearchResponse = {
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    previewUrl?: string;
    preview_url?: string;
    tags?: string[] | null;
    mimeType?: string;
    mime_type?: string;
    width?: number | null;
    height?: number | null;
  }>;
  page?: {
    offset?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
  total?: number;
};

type UpstreamDownloadResponse = {
  id: string;
  title: string;
  fileName?: string;
  file_name?: string;
  mimeType?: string;
  mime_type?: string;
  downloadUrl?: string;
  download_url?: string;
  size?: number | null;
};

function mapItem(
  raw: NonNullable<UpstreamSearchResponse["items"]>[number],
): IconCatalogItem {
  const previewUrl = raw.previewUrl ?? raw.preview_url;
  if (!previewUrl) {
    throw new IconCatalogApiError({
      code: "UPSTREAM_ERROR",
      message: "В ответе поиска нет previewUrl",
    });
  }
  return {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    previewUrl,
    tags: raw.tags ?? null,
    mimeType: raw.mimeType ?? raw.mime_type ?? "image/*",
    width: raw.width ?? null,
    height: raw.height ?? null,
  };
}

function mapSearchResult(
  data: UpstreamSearchResponse,
  input: IconSearchInput,
): IconSearchResult {
  const items = (data.items ?? []).map(mapItem);
  const total = data.page?.total ?? data.total ?? items.length;
  const page =
    data.page?.offset != null &&
    data.page?.limit != null &&
    typeof data.page.hasMore === "boolean"
      ? {
          offset: data.page.offset,
          limit: data.page.limit,
          total,
          hasMore: data.page.hasMore,
        }
      : buildOffsetPaginationMeta({
          offset: input.offset,
          limit: input.limit,
          total,
          itemCount: items.length,
        });

  return { items, page };
}

export const iconCatalogApi = {
  /**
   * Search icons. Rejects empty/whitespace query before network call.
   */
  async search(
    input: Partial<IconSearchInput> & { q: string },
    options?: { signal?: AbortSignal },
  ): Promise<IconSearchResult> {
    const query = normalizeIconSearchQuery(input.q);
    if (!query.ok) {
      throw new IconCatalogApiError(query.error);
    }
    const pagination = normalizeOffsetPagination({
      offset: input.offset,
      limit: input.limit ?? ICON_CATALOG_SEARCH_DEFAULTS.limit,
    });
    if (!pagination.ok) {
      throw new IconCatalogApiError(pagination.error);
    }

    const normalized: IconSearchInput = {
      q: query.q,
      ...pagination.pagination,
    };

    const base = ensureConfigured();
    try {
      const { data } = await axios.get<UpstreamSearchResponse>(
        `${base}/icons/search`,
        {
          params: {
            q: normalized.q,
            offset: normalized.offset,
            limit: normalized.limit,
          },
          headers: authHeaders(),
          timeout: envConfig.iconCatalogTimeout,
          signal: options?.signal,
        },
      );
      return mapSearchResult(data, normalized);
    } catch (error) {
      throw toCatalogError(error);
    }
  },

  /**
   * Resolve PNG downloadUrl for a chosen icon.
   */
  async resolveDownload(
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<PngIconDownloadResult> {
    if (!id.trim()) {
      throw new IconCatalogApiError({
        code: "NOT_FOUND",
        message: "Не указан id иконки",
      });
    }

    const base = ensureConfigured();
    try {
      const { data } = await axios.get<UpstreamDownloadResponse>(
        `${base}/icons/${encodeURIComponent(id)}/download-png`,
        {
          headers: authHeaders(),
          timeout: envConfig.iconCatalogTimeout,
          signal: options?.signal,
        },
      );

      const downloadUrl = data.downloadUrl ?? data.download_url;
      if (!downloadUrl?.trim()) {
        throw new IconCatalogApiError({
          code: "UPSTREAM_ERROR",
          message: "В ответе нет downloadUrl",
        });
      }

      const title = data.title?.trim() || id;
      const fileName =
        data.fileName?.trim() ||
        data.file_name?.trim() ||
        suggestedPngFileName(title, id);

      const mimeType = data.mimeType ?? data.mime_type ?? PNG_ICON_MIME;
      if (mimeType !== PNG_ICON_MIME) {
        throw new IconCatalogApiError({
          code: "INVALID_PNG",
          message: `Ожидался PNG, получили ${mimeType}`,
        });
      }

      return {
        id: data.id || id,
        title,
        fileName: fileName.toLowerCase().endsWith(".png")
          ? fileName
          : suggestedPngFileName(title, id),
        mimeType: PNG_ICON_MIME,
        downloadUrl: downloadUrl.trim(),
        size: data.size ?? null,
      };
    } catch (error) {
      throw toCatalogError(error);
    }
  },

  /**
   * Fetch PNG bytes from downloadUrl for Media upload.
   * Does not use auth headers on the CDN/local file URL.
   */
  async fetchPngFile(
    download: PngIconDownloadResult,
    options?: { signal?: AbortSignal },
  ): Promise<File> {
    try {
      const response = await axios.get<ArrayBuffer>(download.downloadUrl, {
        responseType: "arraybuffer",
        timeout: envConfig.iconCatalogTimeout,
        signal: options?.signal,
      });

      const bytes = response.data.byteLength;
      if (bytes <= 0) {
        throw new IconCatalogApiError({
          code: "INVALID_PNG",
          message: "Пустой PNG-файл",
        });
      }
      if (bytes > ICON_CATALOG_SEARCH_DEFAULTS.maxPngBytes) {
        throw new IconCatalogApiError({
          code: "PNG_TOO_LARGE",
          message: `PNG слишком большой (макс. ${ICON_CATALOG_SEARCH_DEFAULTS.maxPngBytes} байт)`,
        });
      }

      const contentType = String(
        response.headers["content-type"] ?? "",
      ).toLowerCase();
      const pngByType = contentType.includes("png");
      const pngByMagic = looksLikePng(response.data);
      if (!pngByType && !pngByMagic) {
        throw new IconCatalogApiError({
          code: "INVALID_PNG",
          message: "Ожидался PNG (неверный Content-Type / сигнатура)",
        });
      }

      return new File([response.data], download.fileName, {
        type: PNG_ICON_MIME,
      });
    } catch (error) {
      throw toCatalogError(error);
    }
  },
};
