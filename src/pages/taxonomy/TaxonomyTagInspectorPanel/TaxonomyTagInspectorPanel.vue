<script setup lang="ts">
import { Button, Card, Popconfirm, Space, Tag, Typography } from "ant-design-vue";

import type { TaxonomyTag } from "@/types/content";
import { taxonomyTagNamespaceLabel } from "@/types/content";

const { Text, Title } = Typography;

defineProps<{
  tag: TaxonomyTag;
  scopeLabel: string;
  isGroup: boolean;
  groupSelected: boolean;
  deletableAsGroup: boolean;
}>();

const emit = defineEmits<{
  close: [];
  viewComposition: [];
  addChild: [];
  deleteGroup: [];
  deleteTag: [];
}>();
</script>

<template>
  <Card size="small" class="taxonomy-tag-inspector" :bordered="true">
    <template #title>
      <Space direction="vertical" :size="0" style="width: 100%">
        <Title :level="5" style="margin: 0">{{ tag.label }}</Title>
        <Text type="secondary" style="font-size: 12px">Раздел «{{ scopeLabel }}»</Text>
      </Space>
    </template>
    <template #extra>
      <Button type="text" size="small" aria-label="Закрыть" @click="emit('close')">
        ✕
      </Button>
    </template>

    <Space direction="vertical" :size="12" style="width: 100%">
      <div>
        <Text type="secondary" style="display: block; font-size: 12px">Ключ</Text>
        <Text code>{{ tag.key }}</Text>
      </div>
      <div>
        <Text type="secondary" style="display: block; font-size: 12px">Тип</Text>
        <Tag>{{ taxonomyTagNamespaceLabel(tag.namespace) }}</Tag>
      </div>
      <Space wrap :size="8">
        <Button
          v-if="isGroup"
          size="small"
          :type="groupSelected ? 'primary' : 'default'"
          @click="emit('viewComposition')"
        >
          Состав
        </Button>
        <Button size="small" @click="emit('addChild')">Подтег</Button>
        <Button
          v-if="deletableAsGroup"
          size="small"
          danger
          @click="emit('deleteGroup')"
        >
          {{ isGroup ? "Удалить группу" : "Удалить" }}
        </Button>
        <Popconfirm
          v-else
          title="Удалить этот тег?"
          ok-text="Удалить"
          cancel-text="Отмена"
          @confirm="emit('deleteTag')"
        >
          <Button size="small" danger>Удалить</Button>
        </Popconfirm>
      </Space>
    </Space>
  </Card>
</template>

<style scoped>
.taxonomy-tag-inspector {
  width: 280px;
  max-width: calc(100% - 16px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
</style>
