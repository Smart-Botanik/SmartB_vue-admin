<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  cropRoots,
  globalTopicTags,
  selectionToTaxonomyTagIds,
  taxonomyTagIdsToSelection,
  variantsUnderRoot,
  type FlatTaxonomyTag,
} from "@growing/contracts";
import { Select, Typography } from "ant-design-vue";

import type { CropKind, TaxonomyTag, TaxonomyTagNamespace } from "@/types/content";
import { taxonomyTagNamespaceLabel } from "@/types/content";

const props = defineProps<{
  cropKind: CropKind;
  tags: TaxonomyTag[];
  value: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:value": [value: string[]];
}>();

const { Text } = Typography;

function toFlat(tags: TaxonomyTag[]): FlatTaxonomyTag[] {
  return tags.map((tag) => ({
    id: tag.id,
    key: tag.key,
    namespace: tag.namespace,
    label: tag.label,
    sortOrder: tag.sortOrder,
    parentId: tag.parentId,
    cropKind: tag.cropKind as CropKind | null | undefined,
    variantAxis: tag.variantAxis,
    status: tag.status,
  }));
}

const flat = computed(() => toFlat(props.tags));
const cropRootId = ref<string | undefined>();
const variantIds = ref<string[]>([]);
const topicIds = ref<string[]>([]);
const otherIds = ref<string[]>([]);

function syncFromValue() {
  const selection = taxonomyTagIdsToSelection(flat.value, props.value);
  cropRootId.value = selection.cropRootId ?? undefined;
  variantIds.value = selection.variantIds;
  topicIds.value = selection.topicIds;
  otherIds.value = selection.otherIds;
}

watch([flat, () => props.value], syncFromValue, { immediate: true });

const cropOptions = computed(() =>
  cropRoots(flat.value)
    .filter((tag) => tag.cropKind === props.cropKind)
    .map((tag) => ({ value: tag.id, label: tag.label })),
);

const variantOptions = computed(() => {
  if (!cropRootId.value) {
    return [];
  }
  return variantsUnderRoot(flat.value, cropRootId.value).map((tag) => ({
    value: tag.id,
    label: tag.label,
  }));
});

const topicOptions = computed(() =>
  globalTopicTags(flat.value).map((tag) => ({
    value: tag.id,
    label: `${tag.label} (${taxonomyTagNamespaceLabel(tag.namespace as TaxonomyTagNamespace)})`,
  })),
);

const topicAndOtherIds = computed({
  get: () => [...topicIds.value, ...otherIds.value],
  set: (ids: string[]) => {
    const topicSet = new Set(globalTopicTags(flat.value).map((tag) => tag.id));
    topicIds.value = ids.filter((id) => topicSet.has(id));
    otherIds.value = ids.filter((id) => !topicSet.has(id));
    emitSelection();
  },
});

function emitSelection() {
  emit(
    "update:value",
    selectionToTaxonomyTagIds({
      cropRootId: cropRootId.value ?? null,
      variantIds: variantIds.value,
      topicIds: topicIds.value,
      otherIds: otherIds.value,
    }),
  );
}

function onCropRootChange(value: unknown) {
  cropRootId.value = typeof value === "string" ? value : undefined;
  variantIds.value = [];
  emitSelection();
}

function onVariantChange(value: unknown) {
  variantIds.value = Array.isArray(value) ? value.map(String) : [];
  emitSelection();
}
</script>

<template>
  <div>
    <Text type="secondary" style="display: block; margin-bottom: 8px">
      Сначала культура, затем подтеги для этой культуры
    </Text>
    <Select
      allow-clear
      placeholder="Культура (CROP)"
      style="width: 100%; margin-bottom: 8px"
      :disabled="disabled"
      :value="cropRootId"
      :options="cropOptions"
      @update:value="onCropRootChange"
    />
    <Select
      mode="multiple"
      allow-clear
      placeholder="Подвид / тип (CROP_VARIANT)"
      style="width: 100%; margin-bottom: 8px"
      :disabled="disabled || !cropRootId"
      :value="variantIds"
      :options="variantOptions"
      @update:value="onVariantChange"
    />
    <Select
      mode="multiple"
      allow-clear
      placeholder="Темы (TOPIC, PRODUCT_USE)"
      style="width: 100%"
      :disabled="disabled"
      v-model:value="topicAndOtherIds"
      :options="topicOptions"
    />
  </div>
</template>
