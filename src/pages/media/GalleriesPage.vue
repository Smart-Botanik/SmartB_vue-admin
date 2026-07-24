<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PlusOutlined } from "@ant-design/icons-vue";
import { Button, Space, Table, Tag, Typography, message } from "ant-design-vue";

import {
  mediaApi,
  type MediaGallery,
  type MediaPublishStatus,
} from "@/api/media/mediaApi";

const { Title, Text } = Typography;
const router = useRouter();

const rows = ref<MediaGallery[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);

async function load() {
  loading.value = true;
  try {
    const result = await mediaApi.listGalleries({
      page: page.value,
      limit: pageSize.value,
    });
    rows.value = result.galleries;
    total.value = result.pagination.total;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки галерей");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function onTableChange(pagination: { current?: number; pageSize?: number }) {
  page.value = pagination.current ?? 1;
  if (pagination.pageSize && pagination.pageSize !== pageSize.value) {
    pageSize.value = pagination.pageSize;
    page.value = 1;
  }
  void load();
}

function statusColor(status: MediaPublishStatus) {
  if (status === "PUBLISHED") return "green";
  if (status === "ARCHIVED") return "default";
  return "orange";
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <div>
        <Title :level="3" style="margin: 0">Галереи</Title>
        <Text type="secondary">
          Media Library — курируемые наборы фото/видео (ADR-0019). Id копируйте в content
          <code>USEFUL_*_GALLERY_ID</code>.
        </Text>
      </div>
      <Space>
        <Button @click="router.push({ name: 'media-library' })">Файлы</Button>
        <Button type="primary" @click="router.push({ name: 'gallery-create' })">
          <template #icon><PlusOutlined /></template>
          Создать галерею
        </Button>
      </Space>
    </Space>

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
        (record: MediaGallery) => ({
          onClick: () => router.push(`/media/galleries/edit/${record.id}`),
          style: { cursor: 'pointer' },
        })
      "
      @change="onTableChange"
    >
      <Table.Column title="Название" data-index="title">
        <template #default="{ text, record }">
          {{ text || "Без названия" }}
          <div>
            <Text type="secondary" style="font-size: 12px">{{ record.id }}</Text>
          </div>
        </template>
      </Table.Column>
      <Table.Column title="Статус" data-index="status" :width="130">
        <template #default="{ text }">
          <Tag :color="statusColor(text)">{{ text }}</Tag>
        </template>
      </Table.Column>
      <Table.Column title="Элементов" :width="110">
        <template #default="{ record }">{{ record.items?.length ?? 0 }}</template>
      </Table.Column>
      <Table.Column title="Обновлено" data-index="updatedAt" :width="180">
        <template #default="{ text }">
          {{ text ? new Date(text).toLocaleString() : "—" }}
        </template>
      </Table.Column>
    </Table>
  </Space>
</template>
