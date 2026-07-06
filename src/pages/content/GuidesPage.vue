<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PlusOutlined } from "@ant-design/icons-vue";
import { Button, Space, Table, Tabs, Tag, Typography, message } from "ant-design-vue";

import { cropGuideApi } from "@/api/content/cropGuideApi";
import { CROP_KIND_OPTIONS, cropKindLabel, type CropGuide, type CropKind } from "@/types/content";

const { Title, Text } = Typography;
const router = useRouter();

const rows = ref<CropGuide[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const cropKind = ref<CropKind | "ALL">("ALL");

const offset = computed(() => (page.value - 1) * pageSize.value);

const tabItems = computed(() => [
  { key: "ALL", label: "Все" },
  ...CROP_KIND_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label,
  })),
]);

async function loadGuides() {
  loading.value = true;
  try {
    const result = await cropGuideApi.listGuides({
      limit: pageSize.value,
      offset: offset.value,
      cropKind: cropKind.value === "ALL" ? undefined : cropKind.value,
    });
    rows.value = result.items;
    total.value = result.total;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadGuides();
});

function onTabChange(key: string | number) {
  cropKind.value = key as CropKind | "ALL";
  page.value = 1;
  void loadGuides();
}

function onTableChange(pagination: { current?: number; pageSize?: number }) {
  page.value = pagination.current ?? 1;
  if (pagination.pageSize && pagination.pageSize !== pageSize.value) {
    pageSize.value = pagination.pageSize;
    page.value = 1;
  }
  void loadGuides();
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <Title :level="3" style="margin: 0">Руководства</Title>
      <Button type="primary" @click="router.push({ name: 'guide-create' })">
        <template #icon><PlusOutlined /></template>
        Создать
      </Button>
    </Space>
    <Text type="secondary">
      Контент публичного сайта. Редактирование доступно роли ADMIN.
    </Text>
    <Tabs :active-key="cropKind" :items="tabItems" @change="onTabChange" />
    <Table
      row-key="id"
      :loading="loading"
      :data-source="rows"
      :pagination="{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
      }"
      :custom-row="
        (record: CropGuide) => ({
          onClick: () => router.push(`/content/guides/edit/${record.id}`),
          style: { cursor: 'pointer' },
        })
      "
      @change="onTableChange"
    >
      <Table.Column title="Культура" data-index="cropKind">
        <template #default="{ text }">{{ cropKindLabel(text) }}</template>
      </Table.Column>
      <Table.Column title="Заголовок" data-index="title" />
      <Table.Column title="Slug" data-index="slug" />
      <Table.Column title="Статус" data-index="status">
        <template #default="{ text }">
          <Tag :color="text === 'PUBLISHED' ? 'green' : 'default'">{{ text }}</Tag>
        </template>
      </Table.Column>
      <Table.Column title="Telegram" data-index="telegramPublishedAt" :width="110">
        <template #default="{ text }">
          <Tag v-if="text" color="blue">TG</Tag>
          <Text v-else type="secondary">—</Text>
        </template>
      </Table.Column>
      <Table.Column title="Порядок" data-index="sortOrder" :width="90" />
    </Table>
  </Space>
</template>
