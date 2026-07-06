<script setup lang="ts">
import { computed, ref } from "vue";
import { Col, Input, Row, Space, Tabs, Typography } from "ant-design-vue";

import type { MediaUploadResponse } from "@/api/media/mediaApi";
import GuideMediaPanel from "@/components/content/GuideMediaPanel.vue";
import MarkdownPreview from "@/components/content/MarkdownPreview.vue";

const props = defineProps<{
  guideId?: string;
  bodySiteMd: string;
  bodyTelegramMd: string;
  mediaFiles?: MediaUploadResponse[];
}>();

const emit = defineEmits<{
  "update:bodySiteMd": [value: string];
  "update:bodyTelegramMd": [value: string];
  mediaUploaded: [file: MediaUploadResponse];
}>();

const { Text } = Typography;
const TELEGRAM_LIMIT = 4096;

const activeTab = ref<"site" | "telegram">("site");

const mediaUrlById = computed(() =>
  Object.fromEntries(
    (props.mediaFiles ?? []).filter((f) => f.url).map((f) => [f.id, f.url]),
  ),
);

function insertSnippet(snippet: string, field: "site" | "telegram") {
  if (field === "site") {
    emit("update:bodySiteMd", `${props.bodySiteMd.trim()}\n\n${snippet}\n`.trimStart());
  } else {
    emit(
      "update:bodyTelegramMd",
      `${props.bodyTelegramMd.trim()}\n\n${snippet}\n`.trimStart(),
    );
  }
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <GuideMediaPanel
      :guide-id="guideId"
      :active-field="activeTab"
      :uploaded-files="mediaFiles"
      @insert="insertSnippet"
      @media-uploaded="emit('mediaUploaded', $event)"
    />
    <Tabs
      v-model:active-key="activeTab"
      :items="[
        { key: 'site', label: 'Сайт (Markdown)' },
        { key: 'telegram', label: 'Telegram (Markdown)' },
      ]"
    />
    <Row v-if="activeTab === 'site'" :gutter="16">
      <Col :xs="24" :lg="12">
        <Input.TextArea
          :rows="18"
          :value="bodySiteMd"
          placeholder="# Заголовок&#10;&#10;Текст статьи.&#10;&#10;![alt](media://mediaId)"
          @update:value="emit('update:bodySiteMd', $event)"
        />
      </Col>
      <Col :xs="24" :lg="12">
        <MarkdownPreview :markdown="bodySiteMd" :media-url-by-id="mediaUrlById" />
      </Col>
    </Row>
    <Row v-else :gutter="16">
      <Col :xs="24" :lg="12">
        <Input.TextArea
          :rows="14"
          :value="bodyTelegramMd"
          placeholder="Короткий анонс для Telegram-канала..."
          @update:value="emit('update:bodyTelegramMd', $event)"
        />
        <Text
          :type="bodyTelegramMd.length > TELEGRAM_LIMIT ? 'danger' : 'secondary'"
          style="display: block; margin-top: 8px"
        >
          {{ bodyTelegramMd.length }} / {{ TELEGRAM_LIMIT }} символов
        </Text>
      </Col>
      <Col :xs="24" :lg="12">
        <MarkdownPreview :markdown="bodyTelegramMd" :media-url-by-id="mediaUrlById" />
      </Col>
    </Row>
  </Space>
</template>
