<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { formatHashtagsLine } from "@growing/content-markdown";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from "ant-design-vue";

import { cropGuideApi } from "@/api/content/cropGuideApi";
import type { MediaUploadResponse } from "@/api/media/mediaApi";
import ContentTaxonomyFields from "@/components/content/ContentTaxonomyFields.vue";
import GuideContentEditor from "@/components/content/GuideContentEditor.vue";
import { CROP_KIND_OPTIONS, type CropKind, type TaxonomyTag } from "@/types/content";

const DEFAULT_SITE_MD = `---
scope: overview
---

## Заголовок раздела

Текст руководства.

> **Совет:** Полезная заметка.
`;

const { Title, Text } = Typography;
const router = useRouter();

const formModel = ref({
  cropKind: "TOMATO" as CropKind,
  slug: "",
  title: "",
  excerpt: "",
  seoTitle: "",
  seoDescription: "",
  sortOrder: 0,
});

const bodySiteMd = ref(DEFAULT_SITE_MD);
const bodyTelegramMd = ref("");
const coverFiles = ref<MediaUploadResponse[]>([]);
const mediaFiles = ref<MediaUploadResponse[]>([]);
const taxonomyTagIds = ref<string[]>([]);
const taxonomyTags = ref<TaxonomyTag[]>([]);
const submitting = ref(false);
const coverInput = ref<HTMLInputElement | null>(null);
const coverUploading = ref(false);

watch(
  () => formModel.value.cropKind,
  () => {
    taxonomyTagIds.value = [];
  },
);

onMounted(async () => {
  try {
    const page = await cropGuideApi.listTaxonomyTags({ limit: 200, offset: 0 });
    taxonomyTags.value = page.items;
  } catch {
    taxonomyTags.value = [];
  }
});

const telegramHashtagPreview = computed(() => {
  const terms = taxonomyTagIds.value
    .map((tagId) => taxonomyTags.value.find((tag) => tag.id === tagId))
    .filter((tag): tag is TaxonomyTag => Boolean(tag))
    .map((tag) => ({ key: tag.key, label: tag.label, sortOrder: tag.sortOrder }));
  return formatHashtagsLine(terms, { excludeInText: bodyTelegramMd.value }) || null;
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
    const uploaded = await mediaApi.uploadFiles([file], "guides");
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
    await cropGuideApi.createGuide({
      cropKind: formModel.value.cropKind,
      slug,
      title,
      excerpt: formModel.value.excerpt.trim() || null,
      bodySiteMd: bodySiteMd.value,
      bodyTelegramMd: bodyTelegramMd.value,
      coverMediaId: coverFiles.value[0]?.id ?? null,
      seoTitle: formModel.value.seoTitle.trim() || null,
      seoDescription: formModel.value.seoDescription.trim() || null,
      sortOrder: formModel.value.sortOrder ?? 0,
      taxonomyTagIds: taxonomyTagIds.value,
    });
    message.success("Руководство создано");
    await router.push({ name: "guides-list" });
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Title :level="3" style="margin: 0">Новое руководство</Title>
    <Card>
      <Form layout="vertical" :model="formModel">
        <Form.Item label="Культура" name="cropKind" :rules="[{ required: true, message: 'Выберите культуру' }]">
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
        </Form.Item>

        <Form.Item label="Заголовок" name="title" :rules="[{ required: true, message: 'Введите заголовок' }]">
          <Input v-model:value="formModel.title" :maxlength="200" />
        </Form.Item>

        <Form.Item
          label="Slug (URL)"
          name="slug"
          :rules="[{ required: true, message: 'Введите slug' }]"
        >
          <Input
            v-model:value="formModel.slug"
            placeholder="vyrashchivanie-tomatov"
            :maxlength="120"
          />
        </Form.Item>

        <Form.Item label="Краткое описание">
          <Input.TextArea v-model:value="formModel.excerpt" :rows="2" :maxlength="500" />
        </Form.Item>

        <Form.Item label="Порядок сортировки">
          <InputNumber v-model:value="formModel.sortOrder" :min="0" style="width: 100%" />
        </Form.Item>

        <Form.Item label="Обложка">
          <input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverSelected" />
          <Button :loading="coverUploading" @click="coverInput?.click()">
            Загрузить обложку
          </Button>
          <Text v-if="coverFiles[0]?.url" type="secondary" style="display: block; margin-top: 8px">
            Загружена: {{ coverFiles[0].name }}
          </Text>
        </Form.Item>

        <Form.Item label="Контент">
          <GuideContentEditor
            v-model:body-site-md="bodySiteMd"
            v-model:body-telegram-md="bodyTelegramMd"
            :media-files="mediaFiles"
            @media-uploaded="onMediaUploaded"
          />
        </Form.Item>

        <Form.Item label="SEO title">
          <Input v-model:value="formModel.seoTitle" :maxlength="200" />
        </Form.Item>

        <Form.Item label="SEO description">
          <Input.TextArea v-model:value="formModel.seoDescription" :rows="2" :maxlength="500" />
        </Form.Item>

        <Space>
          <Button @click="router.push({ name: 'guides-list' })">Отмена</Button>
          <Button type="primary" :loading="submitting" @click="handleSubmit">Создать</Button>
        </Space>
      </Form>
    </Card>
  </Space>
</template>
