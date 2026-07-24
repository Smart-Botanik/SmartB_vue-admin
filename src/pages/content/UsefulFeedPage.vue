<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  PlusOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  BookOutlined,
  DeleteOutlined,
  CopyOutlined,
  ReloadOutlined,
} from "@ant-design/icons-vue";
import {
  Alert,
  Button,
  Card,
  Empty,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import type { SelectValue } from "ant-design-vue/es/select";

import { cropGuideApi } from "@/api/content/cropGuideApi";
import {
  mediaApi,
  type MediaGallery,
  type MediaGalleryItem,
  type MediaGalleryItemInput,
  type MediaUploadResponse,
} from "@/api/media/mediaApi";
import AddUsefulMediaPostModal from "@/components/content/AddUsefulMediaPostModal.vue";
import { cropKindLabel, type CropGuide } from "@/types/content";
import {
  USEFUL_IMAGE_GALLERY_TITLE,
  USEFUL_INTERESTING_TOPIC_KEY,
  USEFUL_VIDEO_GALLERY_TITLE,
  loadUsefulFeedGalleryBinding,
  saveUsefulFeedGalleryBinding,
} from "@/utils/usefulFeedGalleries";

const { Title, Text, Paragraph } = Typography;
const router = useRouter();

type FeedFilter = "all" | "image" | "video" | "guide";
type FeedPostType = "image" | "video" | "guide";

type FeedPost = {
  key: string;
  type: FeedPostType;
  title: string;
  body?: string | null;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  meta: string;
  statusLabel?: string;
  galleryId?: string;
  item?: MediaGalleryItem;
  guide?: CropGuide;
};

const loading = ref(false);
const saving = ref(false);
const filter = ref<FeedFilter>("all");

const imageGalleryId = ref<string | null>(null);
const videoGalleryId = ref<string | null>(null);
const imageGallery = ref<MediaGallery | null>(null);
const videoGallery = ref<MediaGallery | null>(null);
const allGalleries = ref<MediaGallery[]>([]);
const interestingGuides = ref<CropGuide[]>([]);

const addKind = ref<"IMAGE" | "VIDEO">("IMAGE");
const addModalOpen = ref(false);
const attachGuideOpen = ref(false);
const attachGuideLoading = ref(false);
const allGuides = ref<CropGuide[]>([]);
const selectedGuideId = ref<string | null>(null);
const interestingTagId = ref<string | null>(null);

const filterOptions = [
  { label: "Все посты", value: "all" },
  { label: "Фото", value: "image" },
  { label: "Видео", value: "video" },
  { label: "Гайды", value: "guide" },
];

const gallerySelectOptions = computed(() =>
  allGalleries.value.map((g) => ({
    value: g.id,
    label: `${g.title?.trim() || "Без названия"} · ${g.status} · ${g.items?.length ?? 0} эл.`,
  })),
);

const posts = computed<FeedPost[]>(() => {
  const imagePosts: FeedPost[] = (imageGallery.value?.items ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((item) => {
      const kind = item.media?.kind;
      if (kind) return kind === "IMAGE";
      return !item.media?.mime?.startsWith("video/");
    })
    .map((item) => ({
      key: `image.${item.id}`,
      type: "image" as const,
      title: firstLine(item.caption) || "Фото-пост",
      body: item.caption,
      mediaUrl: item.media?.url ?? null,
      meta: "Фото · галерея «Полезное»",
      statusLabel: imageGallery.value?.status,
      galleryId: imageGallery.value?.id,
      item,
    }));

  const videoPosts: FeedPost[] = (videoGallery.value?.items ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((item) => {
      const kind = item.media?.kind;
      if (kind) return kind === "VIDEO";
      return Boolean(item.media?.mime?.startsWith("video/"));
    })
    .map((item) => ({
      key: `video.${item.id}`,
      type: "video" as const,
      title: firstLine(item.caption) || "Видео-пост",
      body: item.caption,
      mediaUrl: item.media?.url ?? null,
      posterUrl: item.poster?.url ?? null,
      meta: "Видео · галерея «Полезное»",
      statusLabel: videoGallery.value?.status,
      galleryId: videoGallery.value?.id,
      item,
    }));

  const guidePosts: FeedPost[] = interestingGuides.value.map((guide) => ({
    key: `guide.${guide.id}`,
    type: "guide" as const,
    title: guide.title,
    body: guide.excerpt,
    mediaUrl: guide.cover?.url ?? null,
    meta: `Гайд · ${cropKindLabel(guide.cropKind)} · ${guide.status}`,
    statusLabel: guide.status,
    guide,
  }));

  return [...imagePosts, ...videoPosts, ...guidePosts];
});

const visiblePosts = computed(() => {
  if (filter.value === "all") return posts.value;
  return posts.value.filter((p) => p.type === filter.value);
});

function firstLine(text: string | null | undefined): string {
  const line = text?.trim().split(/\n/)[0]?.trim() ?? "";
  return line.length > 96 ? `${line.slice(0, 93)}…` : line;
}

function persistBinding() {
  saveUsefulFeedGalleryBinding({
    imageGalleryId: imageGalleryId.value,
    videoGalleryId: videoGalleryId.value,
  });
}

async function loadGalleryList() {
  const result = await mediaApi.listGalleries({ page: 1, limit: 100 });
  allGalleries.value = result.galleries;
}

async function loadBoundGalleries() {
  imageGallery.value = null;
  videoGallery.value = null;
  if (imageGalleryId.value) {
    try {
      imageGallery.value = await mediaApi.getGallery(imageGalleryId.value);
    } catch {
      message.warning("Фото-галерея не найдена — выберите другую");
      imageGalleryId.value = null;
      persistBinding();
    }
  }
  if (videoGalleryId.value) {
    try {
      videoGallery.value = await mediaApi.getGallery(videoGalleryId.value);
    } catch {
      message.warning("Видео-галерея не найдена — выберите другую");
      videoGalleryId.value = null;
      persistBinding();
    }
  }
}

async function loadInterestingGuides() {
  const result = await cropGuideApi.listGuides({ limit: 100, offset: 0 });
  interestingGuides.value = result.items.filter((guide) =>
    (guide.taxonomyTags ?? []).some((tag) => tag.key === USEFUL_INTERESTING_TOPIC_KEY),
  );
}

async function resolveInterestingTagId() {
  const result = await cropGuideApi.listTaxonomyTags({ limit: 500, offset: 0 });
  const tag = result.items.find((t) => t.key === USEFUL_INTERESTING_TOPIC_KEY);
  interestingTagId.value = tag?.id ?? null;
}

async function reload() {
  loading.value = true;
  try {
    await Promise.all([
      loadGalleryList(),
      loadBoundGalleries(),
      loadInterestingGuides(),
      resolveInterestingTagId(),
    ]);
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки ленты");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const binding = loadUsefulFeedGalleryBinding();
  imageGalleryId.value = binding.imageGalleryId;
  videoGalleryId.value = binding.videoGalleryId;
  void reload();
});

watch([imageGalleryId, videoGalleryId], () => {
  persistBinding();
});

function selectValueToId(value: SelectValue): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (first == null) return null;
    if (typeof first === "object" && "value" in first) {
      return String(first.value);
    }
    return String(first);
  }
  if (typeof value === "object" && "value" in value) {
    return String(value.value);
  }
  return String(value);
}

function onBindImage(value: SelectValue) {
  imageGalleryId.value = selectValueToId(value);
  void loadBoundGalleries();
}

function onBindVideo(value: SelectValue) {
  videoGalleryId.value = selectValueToId(value);
  void loadBoundGalleries();
}

function galleryFilterOption(input: string, option?: { label?: string }) {
  return String(option?.label ?? "")
    .toLowerCase()
    .includes(input.toLowerCase());
}

function onSelectGuide(value: SelectValue) {
  selectedGuideId.value = selectValueToId(value);
}

async function ensureGallery(
  kind: "IMAGE" | "VIDEO",
): Promise<MediaGallery> {
  const existing =
    kind === "IMAGE" ? imageGallery.value : videoGallery.value;
  if (existing) return existing;

  const title =
    kind === "IMAGE" ? USEFUL_IMAGE_GALLERY_TITLE : USEFUL_VIDEO_GALLERY_TITLE;
  const created = await mediaApi.createGallery({
    title,
    status: "PUBLISHED",
    tagIds: [],
    items: [],
  });
  if (kind === "IMAGE") {
    imageGalleryId.value = created.id;
    imageGallery.value = created;
  } else {
    videoGalleryId.value = created.id;
    videoGallery.value = created;
  }
  persistBinding();
  await loadGalleryList();
  message.success(
    `Создана галерея «${title}». Скопируйте id в content USEFUL_${kind === "IMAGE" ? "IMAGE" : "VIDEO"}_GALLERY_ID`,
  );
  return created;
}

function itemsToInput(items: MediaGalleryItem[]): MediaGalleryItemInput[] {
  return items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({
      mediaId: item.mediaId,
      caption: item.caption ?? null,
      alt: item.alt ?? null,
      sortOrder: index,
      posterMediaId: item.posterMediaId ?? null,
      tagIds: item.tagIds ?? [],
    }));
}

async function appendMediaPost(payload: {
  media: MediaUploadResponse;
  caption: string;
  alt: string;
  kind: "IMAGE" | "VIDEO";
}) {
  saving.value = true;
  try {
    const gallery = await ensureGallery(payload.kind);
    const nextItems = [
      ...itemsToInput(gallery.items ?? []),
      {
        mediaId: payload.media.id,
        caption: payload.caption || null,
        alt: payload.alt || null,
        sortOrder: gallery.items?.length ?? 0,
        posterMediaId: null,
        tagIds: [] as string[],
      },
    ];
    const updated = await mediaApi.updateGallery(gallery.id, {
      title: gallery.title,
      status: "PUBLISHED",
      tagIds: gallery.tagIds ?? [],
      items: nextItems,
    });
    if (payload.kind === "IMAGE") {
      imageGallery.value = updated;
      imageGalleryId.value = updated.id;
    } else {
      videoGallery.value = updated;
      videoGalleryId.value = updated.id;
    }
    filter.value = payload.kind === "IMAGE" ? "image" : "video";
    message.success(
      payload.kind === "IMAGE" ? "Фото-пост добавлен в ленту" : "Видео-пост добавлен в ленту",
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Не удалось сохранить пост");
  } finally {
    saving.value = false;
  }
}

function openAddImage() {
  addKind.value = "IMAGE";
  addModalOpen.value = true;
}

function openAddVideo() {
  addKind.value = "VIDEO";
  addModalOpen.value = true;
}

async function removeMediaPost(post: FeedPost) {
  if (!post.galleryId || !post.item) return;
  Modal.confirm({
    title: "Удалить пост из ленты?",
    content: "Элемент будет убран из галереи «Полезное». Файл в Media Library останется.",
    okText: "Удалить",
    okType: "danger",
    cancelText: "Отмена",
    async onOk() {
      saving.value = true;
      try {
        const gallery = await mediaApi.getGallery(post.galleryId!);
        const nextItems = itemsToInput(
          (gallery.items ?? []).filter((item) => item.id !== post.item!.id),
        );
        const updated = await mediaApi.updateGallery(gallery.id, {
          title: gallery.title,
          status: gallery.status,
          tagIds: gallery.tagIds ?? [],
          items: nextItems,
        });
        if (post.type === "image") imageGallery.value = updated;
        else videoGallery.value = updated;
        message.success("Пост удалён из ленты");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Ошибка удаления");
        throw error;
      } finally {
        saving.value = false;
      }
    },
  });
}

function editGuide(post: FeedPost) {
  if (!post.guide) return;
  void router.push(`/content/guides/edit/${post.guide.id}`);
}

async function openAttachGuide() {
  attachGuideOpen.value = true;
  selectedGuideId.value = null;
  attachGuideLoading.value = true;
  try {
    if (!interestingTagId.value) {
      await resolveInterestingTagId();
    }
    const result = await cropGuideApi.listGuides({ limit: 100, offset: 0 });
    allGuides.value = result.items;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Не удалось загрузить гайды");
  } finally {
    attachGuideLoading.value = false;
  }
}

const attachGuideOptions = computed(() =>
  allGuides.value.map((g) => {
    const already = (g.taxonomyTags ?? []).some(
      (t) => t.key === USEFUL_INTERESTING_TOPIC_KEY,
    );
    return {
      value: g.id,
      label: `${g.title}${already ? " · уже в ленте" : ""} · ${g.status}`,
      disabled: already,
    };
  }),
);

async function attachGuideToFeed() {
  if (!selectedGuideId.value) {
    message.warning("Выберите гайд");
    return;
  }
  if (!interestingTagId.value) {
    message.error(
      `Тег ${USEFUL_INTERESTING_TOPIC_KEY} не найден. Создайте его в справочнике таксономии (TOPIC).`,
    );
    return;
  }
  attachGuideLoading.value = true;
  try {
    const guide = allGuides.value.find((g) => g.id === selectedGuideId.value);
    if (!guide) throw new Error("Гайд не найден");
    const tagIds = [
      ...new Set([
        ...(guide.taxonomyTags ?? []).map((t) => t.id),
        interestingTagId.value,
      ]),
    ];
    await cropGuideApi.updateGuide(guide.id, { taxonomyTagIds: tagIds });
    message.success("Гайд добавлен в ленту «Полезное»");
    attachGuideOpen.value = false;
    filter.value = "guide";
    await loadInterestingGuides();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Не удалось привязать гайд");
  } finally {
    attachGuideLoading.value = false;
  }
}

async function copyId(id: string | null) {
  if (!id) {
    message.warning("Сначала выберите или создайте галерею");
    return;
  }
  try {
    await navigator.clipboard.writeText(id);
    message.success("Id скопирован");
  } catch {
    message.info(id);
  }
}

async function publishGallery(kind: "IMAGE" | "VIDEO") {
  const gallery = kind === "IMAGE" ? imageGallery.value : videoGallery.value;
  if (!gallery) return;
  saving.value = true;
  try {
    const updated = await mediaApi.updateGallery(gallery.id, {
      title: gallery.title,
      status: "PUBLISHED",
      tagIds: gallery.tagIds ?? [],
      items: itemsToInput(gallery.items ?? []),
    });
    if (kind === "IMAGE") imageGallery.value = updated;
    else videoGallery.value = updated;
    message.success("Галерея опубликована");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка публикации");
  } finally {
    saving.value = false;
  }
}

function typeTagColor(type: FeedPostType) {
  if (type === "image") return "blue";
  if (type === "video") return "purple";
  return "green";
}

function typeLabel(type: FeedPostType) {
  if (type === "image") return "Фото";
  if (type === "video") return "Видео";
  return "Гайд";
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="start" style="width: 100%; justify-content: space-between" wrap>
      <div>
        <Title :level="3" style="margin: 0">Полезное — лента</Title>
        <Paragraph type="secondary" style="margin: 8px 0 0; max-width: 640px">
          Редактор постов для сайта <code>/useful</code>. Фото и видео хранятся в
          стандартных Media galleries; гайды — с тегом
          <code>{{ USEFUL_INTERESTING_TOPIC_KEY }}</code>.
        </Paragraph>
      </div>
      <Space wrap>
        <Button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </Button>
        <Button @click="openAttachGuide">
          <template #icon><BookOutlined /></template>
          Добавить гайд
        </Button>
        <Button @click="openAddVideo">
          <template #icon><VideoCameraOutlined /></template>
          Добавить видео
        </Button>
        <Button type="primary" @click="openAddImage">
          <template #icon><PlusOutlined /></template>
          Добавить фото
        </Button>
      </Space>
    </Space>

    <Card size="small" title="Привязка галерей (site)">
      <Alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="После создания скопируйте id в content-service: USEFUL_IMAGE_GALLERY_ID / USEFUL_VIDEO_GALLERY_ID"
      />
      <Space direction="vertical" style="width: 100%" size="middle">
        <Space wrap style="width: 100%">
          <Text strong style="min-width: 110px">Фото-галерея</Text>
          <Select
            :value="imageGalleryId ?? undefined"
            allow-clear
            show-search
            placeholder="Выбрать существующую"
            style="min-width: 320px"
            :options="gallerySelectOptions"
            :filter-option="galleryFilterOption"
            @update:value="onBindImage"
          />
          <Button
            size="small"
            :disabled="!imageGalleryId"
            @click="copyId(imageGalleryId)"
          >
            <template #icon><CopyOutlined /></template>
            Id
          </Button>
          <Button
            v-if="imageGallery && imageGallery.status !== 'PUBLISHED'"
            size="small"
            type="primary"
            ghost
            :loading="saving"
            @click="publishGallery('IMAGE')"
          >
            Опубликовать
          </Button>
          <Tag v-if="imageGallery" :color="imageGallery.status === 'PUBLISHED' ? 'green' : 'orange'">
            {{ imageGallery.status }}
          </Tag>
        </Space>
        <Space wrap style="width: 100%">
          <Text strong style="min-width: 110px">Видео-галерея</Text>
          <Select
            :value="videoGalleryId ?? undefined"
            allow-clear
            show-search
            placeholder="Выбрать существующую"
            style="min-width: 320px"
            :options="gallerySelectOptions"
            :filter-option="galleryFilterOption"
            @update:value="onBindVideo"
          />
          <Button
            size="small"
            :disabled="!videoGalleryId"
            @click="copyId(videoGalleryId)"
          >
            <template #icon><CopyOutlined /></template>
            Id
          </Button>
          <Button
            v-if="videoGallery && videoGallery.status !== 'PUBLISHED'"
            size="small"
            type="primary"
            ghost
            :loading="saving"
            @click="publishGallery('VIDEO')"
          >
            Опубликовать
          </Button>
          <Tag v-if="videoGallery" :color="videoGallery.status === 'PUBLISHED' ? 'green' : 'orange'">
            {{ videoGallery.status }}
          </Tag>
        </Space>
        <Text type="secondary">
          Если галерея не выбрана, «Добавить фото/видео» создаст
          «{{ USEFUL_IMAGE_GALLERY_TITLE }}» / «{{ USEFUL_VIDEO_GALLERY_TITLE }}» автоматически.
        </Text>
      </Space>
    </Card>

    <Space style="width: 100%; justify-content: space-between" wrap>
      <Segmented v-model:value="filter" :options="filterOptions" />
      <Text type="secondary">{{ visiblePosts.length }} в ленте</Text>
    </Space>

    <Spin :spinning="loading || saving">
      <div v-if="visiblePosts.length > 0" class="useful-admin-feed">
        <article
          v-for="post in visiblePosts"
          :key="post.key"
          class="useful-admin-feed-card"
        >
          <div class="useful-admin-feed-media">
            <template v-if="post.type === 'video' && post.mediaUrl">
              <video
                :src="post.mediaUrl"
                :poster="post.posterUrl || undefined"
                controls
                playsinline
                preload="metadata"
              />
            </template>
            <template v-else-if="post.mediaUrl">
              <img :src="post.mediaUrl" :alt="post.title" />
            </template>
            <div v-else class="useful-admin-feed-placeholder">
              <PictureOutlined v-if="post.type === 'image'" />
              <VideoCameraOutlined v-else-if="post.type === 'video'" />
              <BookOutlined v-else />
            </div>
          </div>
          <div class="useful-admin-feed-body">
            <Space style="width: 100%; justify-content: space-between" wrap>
              <Tag :color="typeTagColor(post.type)">{{ typeLabel(post.type) }}</Tag>
              <Text type="secondary" style="font-size: 12px">{{ post.meta }}</Text>
            </Space>
            <Title :level="5" style="margin: 8px 0 4px">{{ post.title }}</Title>
            <Paragraph
              v-if="post.body && post.body !== post.title"
              type="secondary"
              :ellipsis="{ rows: 3 }"
              style="margin-bottom: 12px"
            >
              {{ post.body }}
            </Paragraph>
            <Space>
              <Button
                v-if="post.type === 'guide'"
                size="small"
                type="link"
                @click="editGuide(post)"
              >
                Открыть гайд
              </Button>
              <Button
                v-else
                size="small"
                danger
                type="text"
                @click="removeMediaPost(post)"
              >
                <template #icon><DeleteOutlined /></template>
                Убрать из ленты
              </Button>
            </Space>
          </div>
        </article>
      </div>
      <Empty
        v-else
        description="Пока нет постов в этом фильтре. Добавьте фото, видео или гайд."
      >
        <Space>
          <Button type="primary" @click="openAddImage">
            <template #icon><PlusOutlined /></template>
            Добавить фото
          </Button>
          <Button @click="openAddVideo">Добавить видео</Button>
          <Button @click="openAttachGuide">Добавить гайд</Button>
        </Space>
      </Empty>
    </Spin>

    <AddUsefulMediaPostModal
      v-model:open="addModalOpen"
      :kind="addKind"
      @created="appendMediaPost"
    />

    <Modal
      v-model:open="attachGuideOpen"
      title="Добавить гайд в «Полезное»"
      ok-text="Добавить в ленту"
      cancel-text="Отмена"
      :confirm-loading="attachGuideLoading"
      destroy-on-close
      @ok="attachGuideToFeed"
    >
      <Text type="secondary" style="display: block; margin-bottom: 12px">
        На гайд повесится тег <code>{{ USEFUL_INTERESTING_TOPIC_KEY }}</code> — так сайт
        показывает его в ленте /useful.
      </Text>
      <Select
        :value="selectedGuideId ?? undefined"
        show-search
        placeholder="Выберите гайд"
        style="width: 100%"
        :options="attachGuideOptions"
        :loading="attachGuideLoading"
        :filter-option="galleryFilterOption"
        @update:value="onSelectGuide"
      />
      <Button
        type="link"
        style="padding-left: 0; margin-top: 8px"
        @click="router.push({ name: 'guide-create' })"
      >
        Или создать новый гайд
      </Button>
    </Modal>
  </Space>
</template>

<style scoped>
.useful-admin-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.useful-admin-feed-card {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: #fff;
}

.useful-admin-feed-media {
  width: 200px;
  height: 140px;
  overflow: hidden;
  border-radius: 8px;
  background: #fafafa;
}

.useful-admin-feed-media img,
.useful-admin-feed-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.useful-admin-feed-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #bfbfbf;
}

.useful-admin-feed-body {
  min-width: 0;
}

@media (max-width: 640px) {
  .useful-admin-feed-card {
    grid-template-columns: 1fr;
  }

  .useful-admin-feed-media {
    width: 100%;
    height: 180px;
  }
}
</style>
