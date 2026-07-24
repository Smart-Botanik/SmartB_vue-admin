import axios from "axios";
import { envConfig } from "@/config/env";
import { getAccessToken } from "@/utils/token";

export type MediaUploadResponse = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: string;
};

export type MediaKind = "IMAGE" | "VIDEO";
export type MediaPublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type MediaBlob = {
  id: string;
  url: string;
  mime?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  kind?: MediaKind | null;
  posterMediaId?: string | null;
  createdAt?: string;
};

export type MediaGalleryItem = {
  id: string;
  galleryId: string;
  mediaId: string;
  caption?: string | null;
  alt?: string | null;
  sortOrder: number;
  posterMediaId?: string | null;
  tagIds: string[];
  media?: MediaBlob | null;
  poster?: MediaBlob | null;
};

export type MediaGallery = {
  id: string;
  title?: string | null;
  status: MediaPublishStatus;
  tagIds: string[];
  items: MediaGalleryItem[];
  createdAt: string;
  updatedAt: string;
};

export type MediaGalleryItemInput = {
  mediaId: string;
  caption?: string | null;
  alt?: string | null;
  sortOrder?: number;
  posterMediaId?: string | null;
  tagIds?: string[];
};

export type MediaGalleryUpsertInput = {
  title?: string | null;
  status?: MediaPublishStatus;
  tagIds?: string[];
  items?: MediaGalleryItemInput[];
};

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const mediaApi = {
  async uploadFiles(files: File[], folder?: string): Promise<MediaUploadResponse[]> {
    const uploads = files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folder && folder !== "root") {
        formData.append("folder", folder);
      }

      const response = await axios.post<{
        id: string;
        url: string;
        mime?: string;
        mimeType?: string;
        size?: number;
        width?: number;
        height?: number;
        createdAt: string;
      }>(`${envConfig.apiUrl}/media/admin/media/upload`, formData, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      return {
        id: response.data.id,
        name: file.name,
        url: response.data.url,
        size: response.data.size ?? file.size,
        mimeType: response.data.mimeType ?? response.data.mime ?? file.type,
        width: response.data.width,
        height: response.data.height,
        createdAt: response.data.createdAt,
      } satisfies MediaUploadResponse;
    });

    return Promise.all(uploads);
  },

  async deleteMedia(id: string): Promise<void> {
    if (!id.trim()) {
      return;
    }
    await axios.delete(`${envConfig.apiUrl}/media/admin/media/${encodeURIComponent(id)}`, {
      headers: authHeaders(),
    });
  },

  async listMedia(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ media: MediaBlob[]; pagination: { page: number; limit: number; total: number } }> {
    const response = await axios.get(`${envConfig.apiUrl}/media/admin/media`, {
      headers: authHeaders(),
      params,
    });
    return response.data;
  },

  async listGalleries(params?: {
    page?: number;
    limit?: number;
    status?: MediaPublishStatus;
  }): Promise<{
    galleries: MediaGallery[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const response = await axios.get(`${envConfig.apiUrl}/media/admin/galleries`, {
      headers: authHeaders(),
      params,
    });
    return response.data;
  },

  async getGallery(id: string): Promise<MediaGallery> {
    const response = await axios.get(
      `${envConfig.apiUrl}/media/admin/galleries/${encodeURIComponent(id)}`,
      { headers: authHeaders() },
    );
    return response.data;
  },

  async createGallery(input: MediaGalleryUpsertInput): Promise<MediaGallery> {
    const response = await axios.post(`${envConfig.apiUrl}/media/admin/galleries`, input, {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
    return response.data;
  },

  async updateGallery(id: string, input: MediaGalleryUpsertInput): Promise<MediaGallery> {
    const response = await axios.put(
      `${envConfig.apiUrl}/media/admin/galleries/${encodeURIComponent(id)}`,
      input,
      { headers: { ...authHeaders(), "Content-Type": "application/json" } },
    );
    return response.data;
  },

  async deleteGallery(id: string): Promise<void> {
    await axios.delete(
      `${envConfig.apiUrl}/media/admin/galleries/${encodeURIComponent(id)}`,
      { headers: authHeaders() },
    );
  },
};
