<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Button, Space, Table, Typography, Upload, message } from "ant-design-vue";
import { PlusOutlined } from "@ant-design/icons-vue";

import { mediaApi, type MediaBlob } from "@/api/media/mediaApi";

const { Title, Text } = Typography;
const router = useRouter();

const rows = ref<MediaBlob[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);

async function load() {
  loading.value = true;
  try {
    const result = await mediaApi.listMedia({
      page: page.value,
      limit: pageSize.value,
    });
    rows.value = result.media;
    total.value = result.pagination.total;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки файлов");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

async function onUpload(file: File) {
  try {
    await mediaApi.uploadFiles([file], "general");
    message.success("Загружено");
    void load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка upload");
  }
  return false;
}

function onTableChange(pagination: { current?: number; pageSize?: number }) {
  page.value = pagination.current ?? 1;
  if (pagination.pageSize && pagination.pageSize !== pageSize.value) {
    pageSize.value = pagination.pageSize;
    page.value = 1;
  }
  void load();
}
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <div>
        <Title :level="3" style="margin: 0">Media Library</Title>
        <Text type="secondary">Файлы (blob). Галереи — отдельный раздел.</Text>
      </div>
      <Space>
        <Button type="primary" @click="router.push({ name: 'media-galleries' })">
          Галереи
        </Button>
        <Upload :before-upload="onUpload" :show-upload-list="false" accept="image/*,video/*">
          <Button>
            <template #icon><PlusOutlined /></template>
            Загрузить
          </Button>
        </Upload>
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
      @change="onTableChange"
    >
      <Table.Column title="Превью" :width="90">
        <template #default="{ record }">
          <img
            v-if="record.url && !String(record.mime || '').startsWith('video/')"
            :src="record.url"
            alt=""
            style="width: 56px; height: 56px; object-fit: cover; border-radius: 6px"
          />
          <Text v-else type="secondary">{{ record.kind || "file" }}</Text>
        </template>
      </Table.Column>
      <Table.Column title="Id" data-index="id" ellipsis />
      <Table.Column title="MIME" data-index="mime" :width="140" />
      <Table.Column title="Kind" data-index="kind" :width="90" />
    </Table>
  </Space>
</template>
