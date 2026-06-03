<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import type { ColumnsType } from "ant-design-vue/es/table";

import { contentService } from "@/services/content";
import type {
  TaxonomyGroupDeleteStrategy,
  TaxonomyScope,
  TaxonomyTag,
  TaxonomyTagNamespace,
} from "@/types/content";
import {
  DELETE_STRATEGY_LABELS,
  TAXONOMY_TAG_NAMESPACE_OPTIONS,
  taxonomyTagNamespaceLabel,
} from "@/types/content";
import { getAdminReactBaseUrl } from "@growing/admin-shell";
import { flattenForest, isIntentionalRoot } from "./taxonomyDirectoryUtils";

const { Title, Text } = Typography;

const reactFlatTagsHref = `${getAdminReactBaseUrl()}/content/taxonomy-tags`;

const scopes = ref<TaxonomyScope[]>([]);
const activeScopeKey = ref("crop");
const forest = ref<TaxonomyTag[]>([]);
const ungroupedTags = ref<TaxonomyTag[]>([]);
const loading = ref(false);
const selectedGroup = ref<TaxonomyTag | null>(null);

const tagModalOpen = ref(false);
const assignModalOpen = ref(false);
const scopeModalOpen = ref(false);
const deleteModalOpen = ref(false);
const createParentId = ref<string | null>(null);
const deleteStrategy = ref<TaxonomyGroupDeleteStrategy>("PROMOTE_TO_ROOT");
const deleteNewParentId = ref<string | undefined>();
const assignTag = ref<TaxonomyTag | null>(null);
const assignParentId = ref<string | undefined>();

const tagForm = reactive({
  key: "",
  namespace: "CROP" as TaxonomyTagNamespace,
  label: "",
  sortOrder: 0,
});

const scopeForm = reactive({
  key: "",
  label: "",
  description: "",
});

const activeScope = computed(() =>
  scopes.value.find((scope) => scope.key === activeScopeKey.value),
);

const hierarchyRoots = computed(() =>
  forest.value.filter((root) => isIntentionalRoot(root, activeScopeKey.value)),
);

const flatTags = computed(() => flattenForest(forest.value));

const groupChildren = computed(() => {
  if (!selectedGroup.value) {
    return [];
  }
  return flatTags.value.filter((tag) => tag.parentId === selectedGroup.value?.id);
});

const parentOptions = computed(() =>
  flatTags.value
    .filter((tag) => (tag.childIds?.length ?? tag.children?.length ?? 0) > 0)
    .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` })),
);

async function loadScopes() {
  const items = await contentService.listTaxonomyScopes();
  scopes.value = items;
  if (items.length > 0 && !items.some((scope) => scope.key === activeScopeKey.value)) {
    activeScopeKey.value = items[0].key;
  }
}

async function loadForest() {
  if (!activeScopeKey.value) {
    return;
  }
  loading.value = true;
  try {
    const [items, rootPage] = await Promise.all([
      contentService.taxonomyForest(activeScopeKey.value),
      contentService.listTaxonomyTags({
        scopeKey: activeScopeKey.value,
        parentId: null,
        limit: 500,
        offset: 0,
      }),
    ]);
    forest.value = items;
    ungroupedTags.value = rootPage.items.filter(
      (tag) => !isIntentionalRoot(tag, activeScopeKey.value),
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadScopes();
  await loadForest();
});

watch(activeScopeKey, () => {
  selectedGroup.value = null;
  void loadForest();
});

function openCreateTag(parentId: string | null) {
  createParentId.value = parentId;
  tagForm.key = "";
  tagForm.label = "";
  tagForm.sortOrder = 0;
  tagForm.namespace = parentId
    ? "CROP_VARIANT"
    : activeScopeKey.value === "crop"
      ? "CROP"
      : "TOPIC";
  tagModalOpen.value = true;
}

async function onCreateTag() {
  const parent = createParentId.value
    ? flatTags.value.find((tag) => tag.id === createParentId.value)
    : undefined;
  const keyPrefix = parent?.key ?? activeScopeKey.value;
  const segment = tagForm.key.trim().replace(/^\./, "");
  const fullKey = segment.includes(".") ? segment : `${keyPrefix}.${segment}`;
  try {
    await contentService.createTaxonomyTag({
      scopeKey: activeScopeKey.value,
      key: fullKey,
      namespace: tagForm.namespace,
      label: tagForm.label.trim(),
      sortOrder: tagForm.sortOrder ?? 0,
      parentId: createParentId.value,
    });
    message.success("Тег создан");
    tagModalOpen.value = false;
    await loadForest();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  }
}

async function onCreateScope() {
  try {
    await contentService.createTaxonomyScope({
      key: scopeForm.key.trim(),
      label: scopeForm.label.trim(),
      description: scopeForm.description.trim() || null,
    });
    message.success("Раздел создан");
    scopeModalOpen.value = false;
    await loadScopes();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

function openAssignGroup(tag: TaxonomyTag) {
  assignTag.value = tag;
  assignParentId.value = undefined;
  assignModalOpen.value = true;
}

async function onAssignGroup() {
  if (!assignTag.value || !assignParentId.value) {
    message.warning("Выберите группу");
    return;
  }
  try {
    await contentService.updateTaxonomyTag(assignTag.value.id, {
      parentId: assignParentId.value,
    });
    message.success("Группа назначена");
    assignModalOpen.value = false;
    await loadForest();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

async function onDeleteGroup() {
  if (!selectedGroup.value) {
    return;
  }
  try {
    await contentService.deleteTaxonomyGroup(
      selectedGroup.value.id,
      deleteStrategy.value,
      deleteStrategy.value === "REASSIGN" ? deleteNewParentId.value : null,
    );
    message.success("Группа удалена");
    deleteModalOpen.value = false;
    selectedGroup.value = null;
    await loadForest();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  }
}

async function deleteTag(id: string) {
  try {
    await contentService.deleteTaxonomyTag(id);
    message.success("Удалено");
    await loadForest();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

function isGroup(record: TaxonomyTag) {
  return (record.childIds?.length ?? record.children?.length ?? 0) > 0;
}

const hierarchyColumns: ColumnsType<TaxonomyTag> = [
  { title: "Название", dataIndex: "label", key: "label" },
  { title: "Ключ", dataIndex: "key", key: "key" },
  { title: "Действия", key: "actions", width: 300 },
];

const ungroupedColumns: ColumnsType<TaxonomyTag> = [
  { title: "Подпись", dataIndex: "label", key: "label" },
  { title: "Ключ", dataIndex: "key", key: "key" },
  { title: "Тип", dataIndex: "namespace", key: "namespace" },
  { title: "Порядок", dataIndex: "sortOrder", key: "sortOrder", width: 90 },
  { title: "", key: "actions", width: 240 },
];

const childColumns: ColumnsType<TaxonomyTag> = [
  { title: "Подпись", dataIndex: "label", key: "label" },
  { title: "Ключ", dataIndex: "key", key: "key" },
  { title: "Порядок", dataIndex: "sortOrder", key: "sortOrder", width: 90 },
  { title: "", key: "actions", width: 120 },
];

</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <Title :level="3" style="margin: 0">Справочник таксономии</Title>
      <Space>
        <a :href="reactFlatTagsHref" target="_blank" rel="noopener noreferrer">
          Плоский список (React)
        </a>
        <Button @click="scopeModalOpen = true">Добавить раздел</Button>
      </Space>
    </Space>

    <Tabs
      v-if="scopes.length > 0"
      v-model:active-key="activeScopeKey"
      :items="scopes.map((scope) => ({ key: scope.key, label: scope.label }))"
    />

    <Card
      :title="`Иерархия раздела «${activeScope?.label ?? activeScopeKey}»`"
    >
      <template #extra>
        <Button type="primary" @click="openCreateTag(null)">Корневой тег</Button>
      </template>
      <Table
        row-key="id"
        :loading="loading"
        :columns="hierarchyColumns"
        :data-source="hierarchyRoots"
        :pagination="false"
        :children-column-name="'children'"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'key'">
            <Text code>{{ (row as TaxonomyTag).key }}</Text>
          </template>
          <template v-else-if="column.key === 'actions'">
            <Space size="small">
              <Button
                v-if="isGroup(row as TaxonomyTag)"
                size="small"
                :type="selectedGroup?.id === (row as TaxonomyTag).id ? 'primary' : 'default'"
                @click="selectedGroup = row as TaxonomyTag"
              >
                Состав
              </Button>
              <Button size="small" @click="openCreateTag((row as TaxonomyTag).id)">Подтег</Button>
              <Button
                v-if="isGroup(row as TaxonomyTag)"
                size="small"
                danger
                @click="
                  selectedGroup = row as TaxonomyTag;
                  deleteModalOpen = true;
                "
              >
                Удалить группу
              </Button>
              <Button v-else size="small" danger @click="deleteTag((row as TaxonomyTag).id)">
                Удалить
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Card
      v-if="ungroupedTags.length > 0"
      :title="`Несгруппированные теги (${ungroupedTags.length})`"
    >
      <template #extra>
        <Text type="secondary">
          Теги на корневом уровне без своей группы — назначьте родителя или удалите
        </Text>
      </template>
      <Table
        row-key="id"
        :columns="ungroupedColumns"
        :data-source="ungroupedTags"
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'namespace'">
            <Tag>{{ taxonomyTagNamespaceLabel((row as TaxonomyTag).namespace) }}</Tag>
          </template>
          <template v-else-if="column.key === 'key'">
            <Text code>{{ (row as TaxonomyTag).key }}</Text>
          </template>
          <template v-else-if="column.key === 'actions'">
            <Space size="small">
              <Button size="small" type="primary" @click="openAssignGroup(row as TaxonomyTag)">
                Назначить группу
              </Button>
              <Button size="small" danger @click="deleteTag((row as TaxonomyTag).id)">
                Удалить
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Card v-if="selectedGroup" :title="`Состав группы «${selectedGroup.label}»`">
      <template #extra>
        <Space>
          <Button @click="openCreateTag(selectedGroup.id)">Подтег</Button>
          <Button danger @click="deleteModalOpen = true">Удалить группу</Button>
        </Space>
      </template>
      <Table
        row-key="id"
        :columns="childColumns"
        :data-source="groupChildren"
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'actions'">
            <Button size="small" danger @click="deleteTag((row as TaxonomyTag).id)">
              Удалить
            </Button>
          </template>
        </template>
        <template #emptyText>В этой группе пока нет подтегов.</template>
      </Table>
    </Card>

    <Modal
      :title="createParentId ? 'Новый подтег' : 'Новый корневой тег'"
      :open="tagModalOpen"
      @cancel="tagModalOpen = false"
      @ok="onCreateTag"
    >
      <Form layout="vertical" @finish="onCreateTag">
        <Form.Item label="Ключ (сегмент)" required>
          <Input v-model:value="tagForm.key" placeholder="tomato.determinate" />
          <Text type="secondary" style="font-size: 12px">
            Будет добавлен к префиксу раздела или родителя
          </Text>
        </Form.Item>
        <Form.Item label="Тип" required>
          <Select
            v-model:value="tagForm.namespace"
            :options="TAXONOMY_TAG_NAMESPACE_OPTIONS"
          />
        </Form.Item>
        <Form.Item label="Подпись" required>
          <Input v-model:value="tagForm.label" />
        </Form.Item>
        <Form.Item label="Порядок">
          <InputNumber v-model:value="tagForm.sortOrder" :min="0" style="width: 100%" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title="Новый раздел таксономии"
      :open="scopeModalOpen"
      @cancel="scopeModalOpen = false"
      @ok="onCreateScope"
    >
      <Form layout="vertical">
        <Form.Item label="Ключ" required>
          <Input v-model:value="scopeForm.key" placeholder="product" />
        </Form.Item>
        <Form.Item label="Подпись" required>
          <Input v-model:value="scopeForm.label" placeholder="Метки продуктов" />
        </Form.Item>
        <Form.Item label="Описание">
          <Input.TextArea v-model:value="scopeForm.description" :rows="2" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      :title="assignTag ? `Назначить группу для «${assignTag.label}»` : 'Назначить группу'"
      :open="assignModalOpen"
      ok-text="Сохранить"
      @cancel="assignModalOpen = false"
      @ok="onAssignGroup"
    >
      <Text type="secondary" style="display: block; margin-bottom: 12px">
        Выберите группу в разделе «{{ activeScope?.label ?? activeScopeKey }}», к которой
        привязать тег.
      </Text>
      <Select
        allow-clear
        placeholder="Группа-родитель"
        style="width: 100%"
        :options="parentOptions"
        v-model:value="assignParentId"
      />
    </Modal>

    <Modal
      :title="selectedGroup ? `Удаление группы «${selectedGroup.label}»` : 'Удаление группы'"
      :open="deleteModalOpen"
      ok-text="Подтвердить"
      :ok-button-props="{ danger: true }"
      @cancel="deleteModalOpen = false"
      @ok="onDeleteGroup"
    >
      <Text type="secondary" style="display: block; margin-bottom: 12px">
        В группе {{ groupChildren.length }} подтег(ов). Выберите, что с ними сделать.
      </Text>
      <Radio.Group v-model:value="deleteStrategy" style="display: flex; flex-direction: column; gap: 8px">
        <Radio
          v-for="key in (Object.keys(DELETE_STRATEGY_LABELS) as TaxonomyGroupDeleteStrategy[])"
          :key="key"
          :value="key"
        >
          {{ DELETE_STRATEGY_LABELS[key] }}
        </Radio>
      </Radio.Group>
      <Select
        v-if="deleteStrategy === 'REASSIGN'"
        allow-clear
        placeholder="Новая группа"
        style="width: 100%; margin-top: 12px"
        :options="parentOptions.filter((o) => o.value !== selectedGroup?.id)"
        v-model:value="deleteNewParentId"
      />
    </Modal>
  </Space>
</template>
