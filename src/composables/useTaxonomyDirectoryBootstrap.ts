import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { message } from "ant-design-vue";

import { useTaxonomyStore } from "@/stores/taxonomyStore";

export function useTaxonomyDirectoryBootstrap() {
  const taxonomy = useTaxonomyStore();
  const {
    scopeSections,
    loading,
    directoriesLoaded,
    error,
    selectedGroup,
    selectedScopeKey,
    selectedGroupId,
    scopes,
    scopeDirectories,
  } = storeToRefs(taxonomy);

  onMounted(async () => {
    try {
      await taxonomy.bootstrapTaxonomyDirectory();
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : "Ошибка загрузки справочника таксономии",
      );
    }
  });

  return {
    taxonomy,
    scopeSections,
    loading,
    directoriesLoaded,
    error,
    selectedGroup,
    selectedScopeKey,
    selectedGroupId,
    scopes,
    scopeDirectories,
    reloadDirectory: () => taxonomy.bootstrapTaxonomyDirectory(),
  };
}
