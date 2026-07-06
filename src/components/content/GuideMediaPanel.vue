<script setup lang="ts">
import { PictureOutlined, CopyOutlined, UploadOutlined } from "@ant-design/icons-vue";
import { Button, Card, Space, Typography, message } from "ant-design-vue";
import { ref } from "vue";

import { mediaApi, type MediaUploadResponse } from "@/api/media/mediaApi";

const props = withDefaults(
  defineProps<{
    guideId?: string;
    activeField: "site" | "telegram";
    uploadedFiles?: MediaUploadResponse[];
  }>(),
  {
    uploadedFiles: () => [],
  },
);

const emit = defineEmits<{
  insert: [snippet: string, field: "site" | "telegram"];
  mediaUploaded: [file: MediaUploadResponse];
}>();

const { Text } = Typography;
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const storageFolder = props.guideId ? `guides/${props.guideId}` : "guides";

function openFilePicker() {
  fileInput.value?.click();
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  input.value = "";
  if (files.length === 0) {
    return;
  }

  uploading.value = true;
  try {
    const uploaded = await mediaApi.uploadFiles(files, storageFolder);
    for (const file of uploaded) {
      emit("mediaUploaded", file);
    }
    message.success("Файл загружен");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки");
  } finally {
    uploading.value = false;
  }
}

function handleInsert(file: MediaUploadResponse) {
  const alt = file.name?.replace(/\.[^.]+$/, "") ?? "image";
  emit("insert", `![${alt}](media://${file.id})`, props.activeField);
}
</script>

<template>
  <Card size="small" title="Медиа для статьи">
    <Space direction="vertical" style="width: 100%" :size="12">
      <Text type="secondary">
        Загрузите изображение, затем вставьте тег в
        {{ activeField === "site" ? "Site MD" : "Telegram MD" }}.
      </Text>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="onFilesSelected"
      />
      <Button :loading="uploading" @click="openFilePicker">
        <template #icon><UploadOutlined /></template>
        Загрузить изображение
      </Button>
      <Space v-if="uploadedFiles.length > 0" direction="vertical" style="width: 100%">
        <Space v-for="file in uploadedFiles" :key="file.id" wrap>
          <PictureOutlined />
          <Text ellipsis style="max-width: 180px">{{ file.name ?? file.id }}</Text>
          <Button size="small" @click="handleInsert(file)">
            <template #icon><CopyOutlined /></template>
            Вставить
          </Button>
        </Space>
      </Space>
    </Space>
  </Card>
</template>
