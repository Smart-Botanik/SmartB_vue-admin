/** Local binding of site «Полезное» galleries (copy ids into content USEFUL_*_GALLERY_ID). */

const STORAGE_KEY = "admin.useful.feed.galleryIds.v1";

export type UsefulFeedGalleryBinding = {
  imageGalleryId: string | null;
  videoGalleryId: string | null;
};

export const USEFUL_IMAGE_GALLERY_TITLE = "Полезное · Фото";
export const USEFUL_VIDEO_GALLERY_TITLE = "Полезное · Видео";

export const USEFUL_INTERESTING_TOPIC_KEY = "topic.interesting";

export function loadUsefulFeedGalleryBinding(): UsefulFeedGalleryBinding {
  if (typeof localStorage === "undefined") {
    return { imageGalleryId: null, videoGalleryId: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { imageGalleryId: null, videoGalleryId: null };
    const parsed = JSON.parse(raw) as Partial<UsefulFeedGalleryBinding>;
    return {
      imageGalleryId: typeof parsed.imageGalleryId === "string" ? parsed.imageGalleryId : null,
      videoGalleryId: typeof parsed.videoGalleryId === "string" ? parsed.videoGalleryId : null,
    };
  } catch {
    return { imageGalleryId: null, videoGalleryId: null };
  }
}

export function saveUsefulFeedGalleryBinding(binding: UsefulFeedGalleryBinding): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(binding));
}
