<script setup lang="ts">
import { computed } from "vue";

import type { TaxonomyScopeSectionView } from "@/stores/taxonomy/types";
import type { TaxonomyTag } from "@/types/content";
import {
  buildGlobalTaxonomyForestRoots,
  isTaxonomyScopeTreeNode,
} from "../taxonomyDirectoryUtils";
import { TaxonomyScopeInspectorPanel } from "../TaxonomyScopeInspectorPanel";
import { TaxonomyTagInspectorPanel } from "../TaxonomyTagInspectorPanel";
import { TaxonomyTreeCanvas } from "../TaxonomyTreeCanvas";

const props = defineProps<{
  sections: TaxonomyScopeSectionView[];
  loading?: boolean;
  selectedTag: TaxonomyTag | null;
  isGroup: (tag: TaxonomyTag) => boolean;
  isGroupSelected: (scopeKey: string, tagId: string) => boolean;
  isDeletableAsGroup: (tag: TaxonomyTag, scopeKey: string) => boolean;
  scopeLabel: (scopeKey: string) => string;
}>();

const emit = defineEmits<{
  select: [tag: TaxonomyTag];
  close: [];
  addRootTag: [scopeKey: string];
  viewComposition: [scopeKey: string, tagId: string];
  addChild: [scopeKey: string, parentId: string];
  deleteGroup: [scopeKey: string, tag: TaxonomyTag];
  deleteTag: [tagId: string];
}>();

const forestRoots = computed(() => buildGlobalTaxonomyForestRoots(props.sections));

const selectedScopeSection = computed(() => {
  const tag = props.selectedTag;
  if (!tag || !isTaxonomyScopeTreeNode(tag)) {
    return null;
  }
  return props.sections.find(section => section.scope.key === tag.scopeKey) ?? null;
});

const selectedScopeRootCount = computed(
  () => selectedScopeSection.value?.hierarchyRoots.length ?? 0,
);
</script>

<template>
  <div class="taxonomy-global-graph">
    <div class="taxonomy-global-graph__canvas-wrap">
      <TaxonomyTreeCanvas
        variant="global"
        :roots="forestRoots"
        :selected-tag-id="selectedTag?.id"
        :loading="loading"
        empty-hint="Нет разделов таксономии"
        @select="emit('select', $event)"
      />
      <TaxonomyScopeInspectorPanel
        v-if="selectedTag && isTaxonomyScopeTreeNode(selectedTag)"
        class="taxonomy-global-graph__inspector"
        :scope-key="selectedTag.scopeKey"
        :scope-label="scopeLabel(selectedTag.scopeKey)"
        :root-count="selectedScopeRootCount"
        @close="emit('close')"
        @add-root-tag="emit('addRootTag', selectedTag.scopeKey)"
      />
      <TaxonomyTagInspectorPanel
        v-else-if="selectedTag"
        class="taxonomy-global-graph__inspector"
        :tag="selectedTag"
        :scope-label="scopeLabel(selectedTag.scopeKey)"
        :is-group="isGroup(selectedTag)"
        :group-selected="isGroupSelected(selectedTag.scopeKey, selectedTag.id)"
        :deletable-as-group="isDeletableAsGroup(selectedTag, selectedTag.scopeKey)"
        @close="emit('close')"
        @view-composition="emit('viewComposition', selectedTag.scopeKey, selectedTag.id)"
        @add-child="emit('addChild', selectedTag.scopeKey, selectedTag.id)"
        @delete-group="emit('deleteGroup', selectedTag.scopeKey, selectedTag)"
        @delete-tag="emit('deleteTag', selectedTag.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.taxonomy-global-graph__canvas-wrap {
  position: relative;
}

.taxonomy-global-graph__inspector {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  pointer-events: auto;
}
</style>
