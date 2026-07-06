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
};
