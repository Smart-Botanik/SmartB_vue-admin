import { onMounted, watch } from "vue";

import { useAdminStore } from "@/store/useAdminStore";

export function useTaxonomyDirectoryBootstrap() {
  const store = useAdminStore();

  async function reloadDirectory() {
    await store.fetchTaxonomyDirectory();
  }

  onMounted(async () => {
    await store.fetchTaxonomyScopes();
    await store.fetchTaxonomyDirectory();
  });

  watch(
    () => store.taxonomyUi.activeScopeKey,
    () => {
      store.selectGroup(null);
      void reloadDirectory();
    },
  );

  return { store, reloadDirectory };
}
