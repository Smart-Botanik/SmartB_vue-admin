<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { InboxOutlined } from "@ant-design/icons-vue";
import {
  Form,
  Input,
  Modal,
  Upload,
  Typography,
  message,
} from "ant-design-vue";
import type { UploadFile } from "ant-design-vue";

import { mediaApi, type MediaUploadResponse } from "@/api/media/mediaApi";

const props = defineProps<{
  open: boolean;
  /** IMAGE → Add Image, VIDEO → Add Video */
  kind: "IMAGE" | "VIDEO";
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  created: [
    payload: {
      media: MediaUploadResponse;
      caption: string;
      alt: string;
      kind: "IMAGE" | "VIDEO";
    },
  ];
}>();

const { Text } = Typography;

const caption = ref("");
const alt = ref("");
const fileList = ref<UploadFile[]>([]);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);

const title = computed(() =>
  props.kind === "VIDEO" ? "Добавить видео-пост" : "Добавить фото-пост",
);

const accept = computed(() =>
  props.kind === "VIDEO" ? "video/*" : "image/*",
);

const hint = computed(() =>
  props.kind === "VIDEO"
    ? "Загрузите видео для ленты «Полезное». Оно попадёт в видео-галерею сайта."
    : "Загрузите изображение для ленты «Полезное». Оно попадёт в фото-галерею сайта.",
);

function reset() {
  caption.value = "";
  alt.value = "";
  fileList.value = [];
  selectedFile.value = null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
}

watch(
  () => props.open,
  (open) => {
    if (!open) reset();
  },
);

function close() {
  emit("update:open", false);
}

function beforeUpload(file: File) {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (props.kind === "VIDEO" && !isVideo) {
    message.error("Нужен видеофайл");
    return false;
  }
  if (props.kind === "IMAGE" && !isImage) {
    message.error("Нужен файл изображения");
    return false;
  }

  selectedFile.value = file;
  fileList.value = [
    {
      uid: `${Date.now()}`,
      name: file.name,
      status: "done",
      originFileObj: file as UploadFile["originFileObj"],
    },
  ];
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
  return false;
}

function onRemove() {
  selectedFile.value = null;
  fileList.value = [];
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
}

async function submit() {
  if (!selectedFile.value) {
    message.warning(
      props.kind === "VIDEO" ? "Выберите видео" : "Выберите изображение",
    );
    return;
  }
  uploading.value = true;
  try {
    const uploaded = await mediaApi.uploadFiles(
      [selectedFile.value],
      "useful-feed",
    );
    const media = uploaded[0];
    if (!media) {
      throw new Error("Upload вернул пустой ответ");
    }
    emit("created", {
      media,
      caption: caption.value.trim(),
      alt: alt.value.trim(),
      kind: props.kind,
    });
    emit("update:open", false);
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки");
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <Modal
    :open="open"
    :title="title"
    :confirm-loading="uploading"
    ok-text="Добавить в ленту"
    cancel-text="Отмена"
    destroy-on-close
    :width="560"
    @ok="submit"
    @cancel="close"
  >
    <Text type="secondary" style="display: block; margin-bottom: 16px">
      {{ hint }}
    </Text>

    <Upload.Dragger
      :file-list="fileList"
      :before-upload="beforeUpload"
      :accept="accept"
      :max-count="1"
      :disabled="uploading"
      @remove="onRemove"
    >
      <p class="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p class="ant-upload-text">
        {{
          kind === "VIDEO"
            ? "Перетащите видео или нажмите для выбора"
            : "Перетащите фото или нажмите для выбора"
        }}
      </p>
      <p class="ant-upload-hint">
        Файл загрузится при подтверждении. Используется стандартный Media upload.
      </p>
    </Upload.Dragger>

    <div v-if="previewUrl" style="margin-top: 12px">
      <video
        v-if="kind === 'VIDEO'"
        :src="previewUrl"
        controls
        playsinline
        style="width: 100%; max-height: 240px; border-radius: 8px; background: #000"
      />
      <img
        v-else
        :src="previewUrl"
        alt="preview"
        style="width: 100%; max-height: 240px; object-fit: contain; border-radius: 8px; background: #fafafa"
      />
    </div>

    <Form layout="vertical" style="margin-top: 16px">
      <Form.Item label="Подпись (в ленте)">
        <Input.TextArea
          v-model:value="caption"
          :rows="3"
          placeholder="Короткий текст поста"
          :maxlength="500"
          show-count
        />
      </Form.Item>
      <Form.Item label="Alt (доступность)">
        <Input v-model:value="alt" placeholder="Описание изображения" />
      </Form.Item>
    </Form>
  </Modal>
</template>
