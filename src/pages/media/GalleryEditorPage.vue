<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Button,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "ant-design-vue";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons-vue";

import {
  mediaApi,
  type MediaGalleryItemInput,
  type MediaPublishStatus,
  type MediaUploadResponse,
} from "@/api/media/mediaApi";

const { Title, Text } = Typography;
const route = useRoute();
const router = useRouter();

const galleryId = computed(() => {
  const id = route.params.id;
  return typeof id === "string" ? id : "";
});
const isEdit = computed(() => Boolean(galleryId.value));

const saving = ref(false);
const loading = ref(false);
const title = ref("");
const status = ref<MediaPublishStatus>("DRAFT");
const items = ref<
  Array<
    MediaGalleryItemInput & {
      previewUrl?: string;
      kind?: string;
    }
  >
>([]);

const statusOptions = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHED", label: "PUBLISHED" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

async function load() {
  if (!galleryId.value) return;
  loading.value = true;
  try {
    const gallery = await mediaApi.getGallery(galleryId.value);
    title.value = gallery.title ?? "";
    status.value = gallery.status;
    items.value = (gallery.items ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        mediaId: item.mediaId,
        caption: item.caption,
        alt: item.alt,
        sortOrder: item.sortOrder,
        posterMediaId: item.posterMediaId,
        tagIds: item.tagIds ?? [],
        previewUrl: item.media?.url,
        kind: item.media?.kind ?? undefined,
      }));
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Не удалось загрузить");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

async function onUpload(file: File) {
  try {
    const uploaded = await mediaApi.uploadFiles([file], "galleries");
    const row = uploaded[0] as MediaUploadResponse | undefined;
    if (!row) return false;
    items.value.push({
      mediaId: row.id,
      caption: "",
      alt: "",
      sortOrder: items.value.length,
      tagIds: [],
      previewUrl: row.url,
      kind: row.mimeType?.startsWith("video/") ? "VIDEO" : "IMAGE",
    });
    message.success("Файл загружен");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка upload");
  }
  return false;
}

function removeItem(index: number) {
  items.value.splice(index, 1);
  items.value.forEach((item, i) => {
    item.sortOrder = i;
  });
}

async function save() {
  if (items.value.length === 0) {
    message.warning("Добавьте хотя бы один файл");
    return;
  }
  saving.value = true;
  try {
    const payload = {
      title: title.value.trim() || null,
      status: status.value,
      tagIds: [] as string[],
      items: items.value.map((item, index) => ({
        mediaId: item.mediaId,
        caption: item.caption || null,
        alt: item.alt || null,
        sortOrder: index,
        posterMediaId: item.posterMediaId || null,
        tagIds: item.tagIds ?? [],
      })),
    };
    if (isEdit.value) {
      await mediaApi.updateGallery(galleryId.value, payload);
      message.success("Галерея сохранена");
    } else {
      const created = await mediaApi.createGallery(payload);
      message.success("Галерея создана");
      await router.replace(`/media/galleries/edit/${created.id}`);
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  } finally {
    saving.value = false;
  }
}

async function removeGallery() {
  if (!galleryId.value) return;
  saving.value = true;
  try {
    await mediaApi.deleteGallery(galleryId.value);
    message.success("Удалено");
    await router.push({ name: "media-galleries" });
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <Title :level="3" style="margin: 0">
        {{ isEdit ? "Редактирование галереи" : "Новая галерея" }}
      </Title>
      <Button @click="router.push({ name: 'media-galleries' })">К списку</Button>
    </Space>

    <Form layout="vertical" style="max-width: 720px">
      <Form.Item label="Название">
        <Input v-model:value="title" placeholder="useful-photos / полезное фото" />
      </Form.Item>
      <Form.Item label="Статус">
        <Select v-model:value="status" :options="statusOptions" style="width: 220px" />
      </Form.Item>
      <Form.Item v-if="isEdit" label="Id (для content USEFUL_*_GALLERY_ID)">
        <Input :value="galleryId" readonly />
      </Form.Item>
    </Form>

    <div>
      <Space style="margin-bottom: 12px">
        <Text strong>Элементы</Text>
        <Upload :before-upload="onUpload" :show-upload-list="false" accept="image/*,video/*">
          <Button>
            <template #icon><PlusOutlined /></template>
            Загрузить файл
          </Button>
        </Upload>
      </Space>

      <Space direction="vertical" style="width: 100%" size="middle">
        <div
          v-for="(item, index) in items"
          :key="`${item.mediaId}-${index}`"
          style="
            display: grid;
            grid-template-columns: 120px 1fr auto;
            gap: 12px;
            align-items: start;
            padding: 12px;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
          "
        >
          <div>
            <video
              v-if="item.kind === 'VIDEO' || item.previewUrl?.match(/\.(mp4|webm|mov)(\?|$)/i)"
              :src="item.previewUrl"
              style="width: 120px; height: 80px; object-fit: cover; border-radius: 6px"
              muted
            />
            <img
              v-else-if="item.previewUrl"
              :src="item.previewUrl"
              alt=""
              style="width: 120px; height: 80px; object-fit: cover; border-radius: 6px"
            />
            <Text v-else type="secondary">{{ item.mediaId.slice(0, 8) }}…</Text>
          </div>
          <Space direction="vertical" style="width: 100%">
            <Input v-model:value="item.caption" placeholder="Подпись (caption)" />
            <Input v-model:value="item.alt" placeholder="Alt" />
          </Space>
          <Button danger type="text" @click="removeItem(index)">
            <template #icon><DeleteOutlined /></template>
          </Button>
        </div>
        <Text v-if="items.length === 0" type="secondary">Пока нет элементов</Text>
      </Space>
    </div>

    <Space>
      <Button type="primary" :loading="saving" @click="save">Сохранить</Button>
      <Button v-if="isEdit" danger :loading="saving" @click="removeGallery">Удалить</Button>
    </Space>
  </Space>
</template>
