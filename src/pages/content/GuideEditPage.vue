<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatHashtagsLine } from "@growing/content-markdown";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";

import { cropGuideApi } from "@/api/content/cropGuideApi";
import type { MediaUploadResponse } from "@/api/media/mediaApi";
import { telegramApi } from "@/api/telegram/telegramApi";
import ContentTaxonomyFields from "@/components/content/ContentTaxonomyFields.vue";
import GuideContentEditor from "@/components/content/GuideContentEditor.vue";
import GuideTelegramPublishModal from "@/components/content/GuideTelegramPublishModal.vue";
import {
  CROP_KIND_OPTIONS,
  type CropGuide,
  type CropKind,
  type TaxonomyTag,
} from "@/types/content";

const { Title, Text } = Typography;
const route = useRoute();
const router = useRouter();
const guideId = computed(() => String(route.params.id ?? ""));

const guide = ref<CropGuide | null>(null);
const loading = ref(true);
const submitting = ref(false);
const telegramPublishModalOpen = ref(false);
const hasTelegramTargets = ref(true);

const formModel = ref({
  cropKind: "TOMATO" as CropKind,
  slug: "",
  title: "",
  excerpt: "",
  seoTitle: "",
  seoDescription: "",
  sortOrder: 0,
});

const bodySiteMd = ref("");
const bodyTelegramMd = ref("");
const coverFiles = ref<MediaUploadResponse[]>([]);
const mediaFiles = ref<MediaUploadResponse[]>([]);
const taxonomyTagIds = ref<string[]>([]);
const taxonomyTags = ref<TaxonomyTag[]>([]);

const coverInput = ref<HTMLInputElement | null>(null);
const coverUploading = ref(false);

const telegramHashtagPreview = computed(() => {
  const terms = taxonomyTagIds.value
    .map((tagId) => taxonomyTags.value.find((tag) => tag.id === tagId))
    .filter((tag): tag is TaxonomyTag => Boolean(tag))
    .map((tag) => ({ key: tag.key, label: tag.label, sortOrder: tag.sortOrder }));
  const line = formatHashtagsLine(terms, {
    excludeInText: `${bodyTelegramMd.value}\n${bodySiteMd.value}`,
  });
  return line || null;
});

async function loadTelegramTargetsHint() {
  try {
    const bots = await telegramApi.listBots();
    hasTelegramTargets.value = bots.some(
      (bot) => bot.isActive && (bot.channels ?? []).some((channel) => channel.isActive),
    );
  } catch {
    hasTelegramTargets.value = false;
  }
}

async function loadGuide() {
  loading.value = true;
  try {
    const item = await cropGuideApi.getGuide(guideId.value);
    if (!item) {
      message.error("Руководство не найдено");
      await router.push("/content/guides");
      return;
    }
    guide.value = item;
    taxonomyTagIds.value = item.taxonomyTags?.map((tag) => tag.id) ?? [];
    bodySiteMd.value = item.bodySiteMd ?? "";
    bodyTelegramMd.value = item.bodyTelegramMd ?? "";
    formModel.value = {
      cropKind: item.cropKind,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt ?? "",
      seoTitle: item.seoTitle ?? "",
      seoDescription: item.seoDescription ?? "",
      sortOrder: item.sortOrder,
    };
    if (item.cover?.url) {
      coverFiles.value = [
        {
          id: item.cover.id,
          name: item.cover.url,
          url: item.cover.url,
          size: 0,
          mimeType: "image/*",
          createdAt: item.updatedAt,
        },
      ];
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (guideId.value === "create") {
    await router.replace({ name: "guide-create" });
    return;
  }

  await loadGuide();
  try {
    const tagsPage = await cropGuideApi.listTaxonomyTags({ limit: 200, offset: 0 });
    taxonomyTags.value = tagsPage.items;
  } catch {
    taxonomyTags.value = [];
  }
  await loadTelegramTargetsHint();
});

function onMediaUploaded(file: MediaUploadResponse) {
  if (!mediaFiles.value.some((item) => item.id === file.id)) {
    mediaFiles.value = [...mediaFiles.value, file];
  }
}

async function onCoverSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) {
    return;
  }
  coverUploading.value = true;
  try {
    const { mediaApi } = await import("@/api/media/mediaApi");
    const uploaded = await mediaApi.uploadFiles([file], `guides/${guideId.value}`);
    coverFiles.value = uploaded;
    message.success("Обложка загружена");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки обложки");
  } finally {
    coverUploading.value = false;
  }
}

async function handleSubmit() {
  const title = formModel.value.title.trim();
  const slug = formModel.value.slug.trim();
  if (!title) {
    message.error("Заполните заголовок");
    return;
  }
  if (!slug) {
    message.error("Заполните slug");
    return;
  }
  if (!bodySiteMd.value.trim()) {
    message.error("Заполните Markdown для сайта");
    return;
  }

  submitting.value = true;
  try {
    await cropGuideApi.updateGuide(guideId.value, {
      cropKind: formModel.value.cropKind,
      slug,
      title,
      excerpt: formModel.value.excerpt.trim() || null,
      bodySiteMd: bodySiteMd.value,
      bodyTelegramMd: bodyTelegramMd.value,
      coverMediaId: coverFiles.value[0]?.id ?? undefined,
      seoTitle: formModel.value.seoTitle.trim() || null,
      seoDescription: formModel.value.seoDescription.trim() || null,
      sortOrder: formModel.value.sortOrder ?? 0,
      taxonomyTagIds: taxonomyTagIds.value,
    });
    message.success("Сохранено");
    await router.push("/content/guides");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  } finally {
    submitting.value = false;
  }
}

async function handlePublishToggle() {
  if (!guide.value) {
    return;
  }
  try {
    if (guide.value.status === "PUBLISHED") {
      guide.value = await cropGuideApi.unpublishGuide(guide.value.id);
      message.success("Снято с публикации");
    } else {
      guide.value = await cropGuideApi.publishGuide(guide.value.id);
      message.success("Опубликовано");
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка публикации");
  }
}

function openTelegramPublishModal() {
  if (!guide.value) {
    return;
  }
  telegramPublishModalOpen.value = true;
}

async function handleTelegramPublished() {
  if (!guide.value) {
    return;
  }
  const refreshed = await cropGuideApi.getGuide(guide.value.id);
  if (refreshed) {
    guide.value = refreshed;
  }
  await loadTelegramTargetsHint();
}

async function handleDelete() {
  try {
    await cropGuideApi.deleteGuide(guideId.value);
    message.success("Удалено");
    await router.push("/content/guides");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  }
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <Title :level="3" style="margin: 0">Редактирование руководства</Title>
      <Space v-if="guide" wrap>
        <Tag :color="guide.status === 'PUBLISHED' ? 'green' : 'default'">
          {{ guide.status }}
        </Tag>
        <Button
          v-if="guide.status === 'PUBLISHED'"
          :href="`/guides/${guide.slug}`"
          target="_blank"
        >
          Открыть на сайте
        </Button>
        <Button @click="handlePublishToggle">
          {{ guide.status === "PUBLISHED" ? "Unpublish" : "Publish" }}
        </Button>
        <Button type="primary" @click="openTelegramPublishModal">
          Отправить в Telegram
        </Button>
        <Button v-if="guide.telegramPostUrl" :href="guide.telegramPostUrl" target="_blank">
          Пост в Telegram
        </Button>
        <Text v-if="guide.telegramPublishedAt" type="secondary">
          TG: {{ new Date(guide.telegramPublishedAt).toLocaleString("ru-RU") }}
        </Text>
        <Popconfirm title="Удалить руководство?" @confirm="handleDelete">
          <Button danger>Удалить</Button>
        </Popconfirm>
      </Space>
    </Space>

    <Alert
      v-if="guide && !hasTelegramTargets"
      type="warning"
      show-icon
      message="Telegram-канал не настроен"
      description="Добавьте бота и канал в разделе Сообщество → Telegram, затем вернитесь к публикации."
    />

    <GuideTelegramPublishModal
      v-if="guide"
      v-model:open="telegramPublishModalOpen"
      :guide-id="guide.id"
      :guide-title="guide.title"
      :guide-status="guide.status"
      @published="handleTelegramPublished"
    />

    <Card :loading="loading">
      <Form layout="vertical" :model="formModel">
        <Form.Item label="Культура" required>
          <Select v-model:value="formModel.cropKind" :options="CROP_KIND_OPTIONS" />
        </Form.Item>

        <Form.Item label="Таксономия (культура → подтег)">
          <ContentTaxonomyFields
            :crop-kind="formModel.cropKind"
            :tags="taxonomyTags"
            v-model:value="taxonomyTagIds"
            :disabled="submitting"
          />
        </Form.Item>

        <Form.Item v-if="telegramHashtagPreview" label="Хештеги в Telegram (авто)">
          <Text type="secondary">{{ telegramHashtagPreview }}</Text>
          <Text type="secondary" style="display: block; font-size: 12px">
            Добавятся в конец поста при «Отправить в Telegram», если их ещё нет в тексте.
          </Text>
        </Form.Item>

        <Form.Item label="Заголовок" required>
          <Input v-model:value="formModel.title" :maxlength="200" />
        </Form.Item>

        <Form.Item label="Slug" required>
          <Input v-model:value="formModel.slug" :maxlength="120" />
        </Form.Item>

        <Form.Item label="Краткое описание">
          <Input.TextArea v-model:value="formModel.excerpt" :rows="2" :maxlength="500" />
        </Form.Item>

        <Form.Item label="Порядок">
          <InputNumber v-model:value="formModel.sortOrder" :min="0" style="width: 100%" />
        </Form.Item>

        <Form.Item label="Обложка">
          <Text v-if="guide?.cover?.url" type="secondary" style="display: block">
            Текущая: {{ guide.cover.url }}
          </Text>
          <input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverSelected" />
          <Button :loading="coverUploading" style="margin-top: 8px" @click="coverInput?.click()">
            Загрузить обложку
          </Button>
        </Form.Item>

        <Form.Item label="Контент">
          <GuideContentEditor
            :guide-id="guideId"
            v-model:body-site-md="bodySiteMd"
            v-model:body-telegram-md="bodyTelegramMd"
            :media-files="mediaFiles"
            @media-uploaded="onMediaUploaded"
          />
        </Form.Item>

        <Form.Item label="Статус">
          <Select
            :value="guide?.status"
            disabled
            :options="[
              { value: 'DRAFT', label: 'DRAFT' },
              { value: 'PUBLISHED', label: 'PUBLISHED' },
              { value: 'ARCHIVED', label: 'ARCHIVED' },
            ]"
          />
        </Form.Item>

        <Form.Item label="SEO title">
          <Input v-model:value="formModel.seoTitle" :maxlength="200" />
        </Form.Item>

        <Form.Item label="SEO description">
          <Input.TextArea v-model:value="formModel.seoDescription" :rows="2" :maxlength="500" />
        </Form.Item>

        <Space>
          <Button @click="router.push('/content/guides')">Назад</Button>
          <Button type="primary" :loading="submitting" @click="handleSubmit">Сохранить</Button>
        </Space>
      </Form>
    </Card>
  </Space>
</template>
