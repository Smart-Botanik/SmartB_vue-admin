<script setup lang="ts">
import { Button, Card, Space, Tag, Typography } from "ant-design-vue";

import { scopeKeyDotPrefix } from "../taxonomyDirectoryUtils";

const { Text, Title } = Typography;

defineProps<{
  scopeKey: string;
  scopeLabel: string;
  rootCount: number;
}>();

const emit = defineEmits<{
  close: [];
  addRootTag: [];
}>();
</script>

<template>
  <Card size="small" class="taxonomy-scope-inspector" :bordered="true">
    <template #title>
      <Title :level="5" style="margin: 0">Раздел «{{ scopeLabel }}»</Title>
    </template>
    <template #extra>
      <Button type="text" size="small" aria-label="Закрыть" @click="emit('close')">
        ✕
      </Button>
    </template>

    <Space direction="vertical" :size="12" style="width: 100%">
      <div>
        <Text type="secondary" style="display: block; font-size: 12px">Префикс ключей</Text>
        <Tag color="processing" style="margin: 0; font-family: monospace">
          {{ scopeKeyDotPrefix(scopeKey) }}
        </Tag>
      </div>
      <Text type="secondary" style="font-size: 12px">
        Корневых тегов в иерархии: {{ rootCount }}
      </Text>
      <Button type="primary" size="small" block @click="emit('addRootTag')">
        + Добавить корневой тег
      </Button>
    </Space>
  </Card>
</template>

<style scoped>
.taxonomy-scope-inspector {
  width: 280px;
  max-width: calc(100% - 16px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
</style>
