import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { taxonomyApi } from "@/api/taxonomy/taxonomyApi";
import type { CreateTaxonomyScopeInput, CreateTaxonomyTagInput } from "@/api/taxonomy/taxonomyApi";
import {
  cloneJson,
  findTagScopeKey,
  flattenForestSnapshot,
  hydrateForestChildren,
  snapshotTaxonomyForest,
  sortTaxonomyScopes,
} from "@/stores/taxonomy/forestUtils";
import type {
  TaxonomyScopeDirectorySnapshot,
  TaxonomyScopeSectionView,
} from "@/stores/taxonomy/types";
import {
  isIntentionalRoot,
  normalizeTaxonomyTreeForTable,
} from "@/pages/taxonomy/taxonomyDirectoryUtils";
import type {
  TaxonomyGroupDeleteStrategy,
  TaxonomyScope,
  TaxonomyTag,
} from "@/types/content";

export const useTaxonomyStore = defineStore("taxonomy", () => {
  const loading = ref(false);
  const scopesLoaded = ref(false);
  const directoriesLoaded = ref(false);
  const error = ref<string | null>(null);
  const scopes = ref<TaxonomyScope[]>([]);
  const scopeDirectories = ref<Record<string, TaxonomyScopeDirectorySnapshot>>({});
  const selectedScopeKey = ref<string | null>(null);
  const selectedGroupId = ref<string | null>(null);

  const selectedGroup = computed((): TaxonomyTag | null => {
    const scopeKey = selectedScopeKey.value;
    const groupId = selectedGroupId.value;
    if (!scopeKey || !groupId) {
      return null;
    }
    const directory = scopeDirectories.value[scopeKey];
    if (!directory?.forestTree.length) {
      return null;
    }
    return (
      flattenForestSnapshot(directory.forestTree).find(tag => tag.id === groupId) ?? null
    );
  });

  const scopeSections = computed((): TaxonomyScopeSectionView[] => {
    return scopes.value.map(scope => {
      const directory = scopeDirectories.value[scope.key];
      const forestTree = normalizeTaxonomyTreeForTable(
        cloneJson(directory?.forestTree ?? []),
      );
      return {
        scope: { ...scope },
        forestTree,
        hierarchyRoots: forestTree.filter(tag => isIntentionalRoot(tag, scope.key)),
        ungroupedTags: cloneJson(directory?.ungroupedTags ?? []),
      };
    });
  });

  function setError(err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
  }

  function selectGroup(scopeKey: string, groupId: string | null) {
    selectedScopeKey.value = groupId ? scopeKey : null;
    selectedGroupId.value = groupId;
  }

  async function fetchScopes() {
    error.value = null;
    try {
      scopes.value = sortTaxonomyScopes(await taxonomyApi.listScopes());
      scopesLoaded.value = true;
    } catch (err) {
      setError(err);
      scopesLoaded.value = false;
      throw err;
    }
  }

  async function fetchDirectory(scopeKey?: string) {
    const scopeKeys = scopeKey ? [scopeKey] : scopes.value.map(scope => scope.key);
    if (scopeKeys.length === 0) {
      throw new Error(
        "Сначала загрузите разделы таксономии (taxonomyScopes), затем иерархию (taxonomyForest)",
      );
    }

    loading.value = true;
    error.value = null;

    try {
      for (const key of scopeKeys) {
        const forest = hydrateForestChildren(
          snapshotTaxonomyForest(cloneJson(await taxonomyApi.fetchForest(key))),
        );
        const rootItems = await taxonomyApi.listRootTags(key);
        const ungroupedTags = rootItems.filter(tag => !isIntentionalRoot(tag, key));

        scopeDirectories.value[key] = {
          forestTree: cloneJson(forest),
          ungroupedTags: cloneJson(ungroupedTags),
        };
      }
      scopeDirectories.value = { ...scopeDirectories.value };
      directoriesLoaded.value = true;
    } catch (err) {
      setError(err);
      directoriesLoaded.value = false;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function bootstrapTaxonomyDirectory() {
    await fetchScopes();
    await fetchDirectory();
  }

  async function createTaxonomyScope(input: CreateTaxonomyScopeInput) {
    const scopeKey = input.key.trim().toLowerCase();
    await taxonomyApi.createScope({ ...input, key: scopeKey });
    await fetchScopes();
    await fetchDirectory(scopeKey);
  }

  async function createTaxonomyTag(input: CreateTaxonomyTagInput) {
    await taxonomyApi.createTag(input);
    await fetchDirectory(input.scopeKey);
  }

  async function updateTaxonomyTag(
    id: string,
    input: Parameters<typeof taxonomyApi.updateTag>[1],
  ) {
    const scopeKey = findTagScopeKey(scopeDirectories.value, id);
    await taxonomyApi.updateTag(id, input);
    await fetchDirectory(scopeKey);
  }

  async function deleteTaxonomyTag(id: string) {
    const scopeKey = findTagScopeKey(scopeDirectories.value, id);
    await taxonomyApi.deleteTag(id);
    if (selectedGroupId.value === id) {
      selectedGroupId.value = null;
      selectedScopeKey.value = null;
    }
    await fetchDirectory(scopeKey);
  }

  async function deleteTaxonomyGroup(
    id: string,
    strategy: TaxonomyGroupDeleteStrategy,
    newParentId?: string | null,
  ) {
    const scopeKey = findTagScopeKey(scopeDirectories.value, id);
    await taxonomyApi.deleteGroup(id, strategy, newParentId);
    selectedGroupId.value = null;
    selectedScopeKey.value = null;
    await fetchDirectory(scopeKey);
  }

  function directoryForScope(scopeKey: string): TaxonomyScopeDirectorySnapshot | undefined {
    return scopeDirectories.value[scopeKey];
  }

  return {
    loading,
    scopesLoaded,
    directoriesLoaded,
    error,
    scopes,
    scopeDirectories,
    selectedScopeKey,
    selectedGroupId,
    selectedGroup,
    scopeSections,
    selectGroup,
    bootstrapTaxonomyDirectory,
    fetchScopes,
    fetchDirectory,
    createTaxonomyScope,
    createTaxonomyTag,
    updateTaxonomyTag,
    deleteTaxonomyTag,
    deleteTaxonomyGroup,
    directoryForScope,
  };
});
