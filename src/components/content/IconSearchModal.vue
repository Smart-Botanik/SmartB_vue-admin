<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { SearchOutlined } from "@ant-design/icons-vue";
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import {
  ICON_CATALOG_SEARCH_DEFAULTS,
  normalizeIconSearchQuery,
  type IconCatalogItem,
} from "@growing/contracts";

import {
  IconCatalogApiError,
  iconCatalogApi,
} from "@/api/content/iconCatalogApi";
import { mediaApi, type MediaUploadResponse } from "@/api/media/mediaApi";

const props = defineProps<{
  open: boolean;
  /** Media folder, e.g. facets/culture/tomato */
  mediaFolder: string;
  hasExistingLogo?: boolean;
  cultureLabel?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  applied: [media: MediaUploadResponse];
}>();

const { Text } = Typography;

const query = ref("");
const queryError = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const loading = ref(false);
const applyingId = ref<string | null>(null);
const items = ref<IconCatalogItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ICON_CATALOG_SEARCH_DEFAULTS.limit;
const hasSearched = ref(false);

let searchSeq = 0;
let searchAbort: AbortController | null = null;
let applyAbort: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const modalTitle = computed(() =>
  props.cultureLabel
    ? `Найти PNG-иконку — ${props.cultureLabel}`
    : "Найти PNG-иконку",
);

const applying = computed(() => applyingId.value != null);

function clearSearchRequest() {
  searchAbort?.abort();
  searchAbort = null;
}

function clearApplyRequest() {
  applyAbort?.abort();
  applyAbort = null;
}

function resetState() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  clearSearchRequest();
  clearApplyRequest();
  query.value = "";
  queryError.value = null;
  errorMessage.value = null;
  loading.value = false;
  applyingId.value = null;
  items.value = [];
  total.value = 0;
  page.value = 1;
  hasSearched.value = false;
}

function closeModal() {
  if (applying.value) {
    return;
  }
  emit("update:open", false);
}

function mapError(error: unknown): string {
  if (error instanceof IconCatalogApiError) {
    return error.message;
  }
  if (error instanceof Error && error.name === "CanceledError") {
    return "";
  }
  if (error instanceof Error && error.message.toLowerCase().includes("abort")) {
    return "";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Не удалось выполнить запрос";
}

async function runSearch(
  nextPage = page.value,
  options?: { showEmptyError?: boolean },
) {
  const normalized = normalizeIconSearchQuery(query.value);
  if (!normalized.ok) {
    if (options?.showEmptyError) {
      queryError.value = normalized.error.message;
    } else {
      queryError.value = null;
    }
    errorMessage.value = null;
    items.value = [];
    total.value = 0;
    hasSearched.value = false;
    loading.value = false;
    clearSearchRequest();
    return;
  }

  queryError.value = null;
  const seq = ++searchSeq;
  clearSearchRequest();
  searchAbort = new AbortController();
  loading.value = true;
  errorMessage.value = null;
  hasSearched.value = true;

  try {
    const result = await iconCatalogApi.search(
      {
        q: normalized.q,
        offset: (nextPage - 1) * pageSize,
        limit: pageSize,
      },
      { signal: searchAbort.signal },
    );
    if (seq !== searchSeq) {
      return;
    }
    items.value = result.items;
    total.value = result.page.total;
    page.value = nextPage;
  } catch (error) {
    if (seq !== searchSeq) {
      return;
    }
    const msg = mapError(error);
    if (!msg) {
      return;
    }
    items.value = [];
    total.value = 0;
    errorMessage.value = msg;
  } finally {
    if (seq === searchSeq) {
      loading.value = false;
    }
  }
}

function scheduleSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    page.value = 1;
    void runSearch(1, { showEmptyError: false });
  }, 350);
}

function onQuerySearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  page.value = 1;
  void runSearch(1, { showEmptyError: true });
}

function onPageChange(nextPage: number) {
  void runSearch(nextPage);
}

async function applyIcon(item: IconCatalogItem) {
  if (applying.value || !props.mediaFolder.trim()) {
    if (!props.mediaFolder.trim()) {
      errorMessage.value = "Сначала выберите культуру";
    }
    return;
  }

  const doApply = async () => {
    applyingId.value = item.id;
    errorMessage.value = null;
    clearApplyRequest();
    applyAbort = new AbortController();
    const signal = applyAbort.signal;

    try {
      const download = await iconCatalogApi.resolveDownload(item.id, {
        signal,
      });
      const file = await iconCatalogApi.fetchPngFile(download, { signal });
      const uploaded = await mediaApi.uploadFiles([file], props.mediaFolder);
      const media = uploaded[0];
      if (!media) {
        throw new IconCatalogApiError({
          code: "UPSTREAM_ERROR",
          message: "Media не вернул загруженный файл",
        });
      }
      emit("applied", media);
      message.success("LOGO (PNG) подставлен — сохраните профиль");
      emit("update:open", false);
    } catch (error) {
      const msg = mapError(error);
      if (msg) {
        errorMessage.value = msg;
      }
    } finally {
      applyingId.value = null;
      applyAbort = null;
    }
  };

  if (props.hasExistingLogo) {
    Modal.confirm({
      title: "Заменить LOGO?",
      content: `Текущий LOGO будет заменён на «${item.title}» (PNG). Профиль нужно сохранить отдельно.`,
      okText: "Заменить",
      cancelText: "Отмена",
      onOk: () => doApply(),
    });
    return;
  }

  await doApply();
}

watch(
  () => props.open,
  () => {
    resetState();
  },
);
</script>

<template>
  <Modal
    :open="open"
    :title="modalTitle"
    :width="720"
    :footer="null"
    :mask-closable="!applying"
    :closable="!applying"
    destroy-on-close
    @cancel="closeModal"
  >
    <Space direction="vertical" size="middle" style="width: 100%">
      <Text type="secondary">
        Поиск PNG в каталоге иконок. Выбор загрузит файл в Media и подставит LOGO.
      </Text>

      <Input.Search
        v-model:value="query"
        allow-clear
        enter-button
        :disabled="applying"
        :loading="loading"
        placeholder="Например: tomato, pepper, leaf…"
        :maxlength="ICON_CATALOG_SEARCH_DEFAULTS.maxQueryLength"
        @search="onQuerySearch"
        @change="scheduleSearch"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </Input.Search>

      <Text v-if="queryError" type="danger">{{ queryError }}</Text>

      <Alert
        v-if="errorMessage"
        type="error"
        show-icon
        closable
        :message="errorMessage"
        @close="errorMessage = null"
      />

      <Spin :spinning="loading || applying">
        <Empty
          v-if="!loading && !hasSearched"
          description="Введите запрос, чтобы найти PNG-иконку"
        />
        <Empty
          v-else-if="!loading && hasSearched && items.length === 0 && !errorMessage"
          description="Ничего не найдено"
        />
        <div v-else class="icon-grid">
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            class="icon-tile"
            :class="{ 'icon-tile--busy': applyingId === item.id }"
            :disabled="applying"
            :title="item.title"
            @click="applyIcon(item)"
          >
            <div class="icon-tile__preview">
              <img :src="item.previewUrl" :alt="item.title" loading="lazy" />
            </div>
            <Text class="icon-tile__title" ellipsis>
              {{ item.title }}
            </Text>
            <Text
              v-if="item.subtitle"
              type="secondary"
              class="icon-tile__subtitle"
              ellipsis
            >
              {{ item.subtitle }}
            </Text>
            <div v-if="item.tags?.length" class="icon-tile__tags">
              <Tag
                v-for="tag in item.tags.slice(0, 2)"
                :key="tag"
                class="icon-tile__tag"
              >
                {{ tag }}
              </Tag>
            </div>
            <Spin
              v-if="applyingId === item.id"
              size="small"
              class="icon-tile__spin"
            />
          </button>
        </div>
      </Spin>

      <div
        v-if="total > pageSize"
        style="display: flex; justify-content: flex-end"
      >
        <Pagination
          :current="page"
          :page-size="pageSize"
          :total="total"
          size="small"
          :disabled="loading || applying"
          @change="onPageChange"
        />
      </div>

      <div style="display: flex; justify-content: flex-end">
        <Button :disabled="applying" @click="closeModal">Закрыть</Button>
      </div>
    </Space>
  </Modal>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 12px;
  min-height: 120px;
}

.icon-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.icon-tile:hover:not(:disabled) {
  border-color: #1677ff;
  box-shadow: 0 0 0 1px #1677ff33;
}

.icon-tile:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.icon-tile--busy {
  border-color: #1677ff;
}

.icon-tile__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  background: #fff;
  border-radius: 4px;
}

.icon-tile__preview img {
  max-width: 48px;
  max-height: 48px;
  object-fit: contain;
}

.icon-tile__title {
  font-size: 12px;
  line-height: 1.3;
}

.icon-tile__subtitle {
  font-size: 11px;
  line-height: 1.2;
}

.icon-tile__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.icon-tile__tag {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.icon-tile__spin {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 8px;
}
</style>
