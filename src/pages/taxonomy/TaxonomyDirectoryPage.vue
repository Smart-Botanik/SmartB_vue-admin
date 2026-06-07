<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import type { ColumnsType } from "ant-design-vue/es/table";

import { useTaxonomyDirectoryBootstrap } from "@/composables/useTaxonomyDirectoryBootstrap";
import type {
  TaxonomyGroupDeleteStrategy,
  TaxonomyTag,
  TaxonomyTagNamespace,
} from "@/types/content";
import { DELETE_STRATEGY_LABELS, taxonomyTagNamespaceLabel } from "@/types/content";
import {
  childCreateButtonLabel,
  createTagModalTitle,
  groupParentOptions,
  defaultNamespaceForCreate,
  flattenForest,
  hierarchyHint,
  isDeletableAsGroup,
  isNamespaceLocked,
  rootCreateButtonLabel,
  showVariantAxisField,
  formatCreateTaxonomyTagError,
  getCreateTagKeyValidationError,
  initialCreateTagKeyInput,
  createTagNamespaceDisplayLabel,
  resolveCreateTagApiParentId,
  resolveCreateTagFullKey,
  scopeKeyDotPrefix,
  taxonomyCreateKeyPrefix,
  isTaxonomyScopeTreeNode,
} from "./taxonomyDirectoryUtils";
import { TaxonomyGlobalGraphView } from "./TaxonomyGlobalGraphView";

const { Title, Text } = Typography;

type DirectoryViewMode = "tables" | "graph";

const directoryViewMode = ref<DirectoryViewMode>("tables");
const graphSelectedTag = ref<TaxonomyTag | null>(null);

const {
  taxonomy,
  scopeSections,
  loading,
  directoriesLoaded,
  error,
  selectedGroup,
  selectedScopeKey,
  selectedGroupId,
} = useTaxonomyDirectoryBootstrap();

const tagModalOpen = ref(false);
const assignModalOpen = ref(false);
const scopeModalOpen = ref(false);
const deleteModalOpen = ref(false);
const actionScopeKey = ref("crop");
const createParentId = ref<string | null>(null);
const deleteStrategy = ref<TaxonomyGroupDeleteStrategy>("PROMOTE_TO_ROOT");
const deleteNewParentId = ref<string | undefined>();
const assignTag = ref<TaxonomyTag | null>(null);
const assignParentId = ref<string | undefined>();

/** Ключи разделов, у которых раскрыта таблица корневой иерархии (групп). */
const hierarchyCollapseKeys = ref<string[]>([]);

/** Синхронизация activeKey только при смене списка разделов (не при перезагрузке дерева). */
watch(
  () => scopeSections.value.map(section => section.scope.key).join("\0"),
  () => {
    const keys = scopeSections.value.map(section => section.scope.key);
    const open = new Set(hierarchyCollapseKeys.value);
    hierarchyCollapseKeys.value = keys.filter(key => open.has(key));
  },
  { immediate: true },
);

const tagForm = reactive({
  key: "",
  namespace: "CROP" as TaxonomyTagNamespace,
  label: "",
  variantAxis: "",
});

const tagFormKeyError = ref<string | undefined>();

function clearTagFormKeyError() {
  tagFormKeyError.value = undefined;
}

function setTagFormKeyError(error: string) {
  tagFormKeyError.value = error;
}

const scopeForm = reactive({
  key: "",
  label: "",
  description: "",
});

function scopeLabel(scopeKey: string): string {
  return taxonomy.scopes.find(scope => scope.key === scopeKey)?.label ?? scopeKey;
}

function flatTagsForScope(scopeKey: string): TaxonomyTag[] {
  const directory = taxonomy.directoryForScope(scopeKey);
  return flattenForest(directory?.forestTree ?? []);
}

function groupChildren(): TaxonomyTag[] {
  const group = selectedGroup.value;
  if (!group) {
    return [];
  }
  return flatTagsForScope(group.scopeKey).filter(tag => tag.parentId === group.id);
}

function parentOptionsForScope(scopeKey: string) {
  return flatTagsForScope(scopeKey)
    .filter(tag => (tag.childIds?.length ?? tag.children?.length ?? 0) > 0)
    .map(tag => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
}

const tagModalTitle = computed(() =>
  createTagModalTitle(actionScopeKey.value, createParentId.value),
);

const createTagKeyPrefix = computed(() => {
  const scopeKey = actionScopeKey.value;
  const parent = createParentId.value
    ? flatTagsForScope(scopeKey).find(tag => tag.id === createParentId.value)
    : undefined;
  return taxonomyCreateKeyPrefix(parent, scopeKey);
});

const createTagKeyDotPrefix = computed(() => scopeKeyDotPrefix(createTagKeyPrefix.value));

const createTagKeyPreview = computed(() => {
  const fullKey = resolveCreateTagFullKey(
    tagForm.key,
    createTagKeyPrefix.value,
    createParentId.value != null,
  );
  return fullKey ?? `${createTagKeyDotPrefix.value}…`;
});

const createTagKeyHelp = computed(() => {
  if (tagFormKeyError.value) {
    return tagFormKeyError.value;
  }
  return `Dot-нотация: полный ключ будет «${createTagKeyPreview.value}». Допишите сегмент после «${createTagKeyDotPrefix.value}»`;
});

const createTagKeyPlaceholder = computed(() =>
  createParentId.value
    ? "determinate"
    : actionScopeKey.value === "crop"
      ? "tomato"
      : "topic",
);

const namespaceLocked = computed(() =>
  isNamespaceLocked(actionScopeKey.value, createParentId.value),
);

const lockedNamespaceLabel = computed(() =>
  createTagNamespaceDisplayLabel(
    actionScopeKey.value,
    tagForm.namespace,
    createParentId.value != null,
  ),
);

function openCreateTag(scopeKey: string, parentId: string | null) {
  actionScopeKey.value = scopeKey;
  createParentId.value = parentId;
  const parent = parentId
    ? flatTagsForScope(scopeKey).find(tag => tag.id === parentId)
    : undefined;
  const keyPrefix = taxonomyCreateKeyPrefix(parent, scopeKey);
  tagForm.key = initialCreateTagKeyInput(parentId, keyPrefix);
  tagForm.label = "";
  tagForm.variantAxis = "";
  tagForm.namespace = defaultNamespaceForCreate(scopeKey, parentId, parent);
  clearTagFormKeyError();
  tagModalOpen.value = true;
}

async function onCreateTag() {
  const scopeKey = actionScopeKey.value;
  const flatTags = flatTagsForScope(scopeKey);
  const parent = createParentId.value
    ? flatTags.find(tag => tag.id === createParentId.value)
    : undefined;
  const keyError = getCreateTagKeyValidationError(
    tagForm.key,
    parent,
    scopeKey,
    createParentId.value,
  );
  if (keyError) {
    setTagFormKeyError(keyError);
    return;
  }
  const keyPrefix = taxonomyCreateKeyPrefix(parent, scopeKey);
  const fullKey = resolveCreateTagFullKey(
    tagForm.key,
    keyPrefix,
    createParentId.value != null,
  );
  if (!fullKey) {
    setTagFormKeyError(
      `Укажите сегмент ключа после «${scopeKeyDotPrefix(taxonomyCreateKeyPrefix(parent, scopeKey))}»`,
    );
    return;
  }
  const apiParentId = resolveCreateTagApiParentId(parent);
  if (createParentId.value && !apiParentId) {
    setTagFormKeyError("Не выбран родитель для подтега");
    return;
  }
  clearTagFormKeyError();
  try {
    await taxonomy.createTaxonomyTag({
      scopeKey,
      key: fullKey,
      namespace: tagForm.namespace,
      label: tagForm.label.trim(),
      sortOrder: 0,
      parentId: apiParentId,
      cropKind: null,
      variantAxis:
        tagForm.namespace === "CROP_VARIANT" && tagForm.variantAxis.trim()
          ? tagForm.variantAxis.trim()
          : null,
    });
    message.success("Тег создан");
    tagModalOpen.value = false;
  } catch (error) {
    setTagFormKeyError(formatCreateTaxonomyTagError(error, parent));
  }
}

async function onCreateScope() {
  try {
    await taxonomy.createTaxonomyScope({
      key: scopeForm.key.trim().toLowerCase(),
      label: scopeForm.label.trim(),
      description: scopeForm.description.trim() || null,
    });
    message.success("Раздел создан");
    scopeModalOpen.value = false;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

function openAssignGroup(scopeKey: string, tag: TaxonomyTag) {
  actionScopeKey.value = scopeKey;
  assignTag.value = tag;
  assignParentId.value = undefined;
  assignModalOpen.value = true;
}

async function onAssignGroup() {
  if (!assignTag.value || !assignParentId.value) {
    message.warning("Выберите родителя");
    return;
  }
  try {
    await taxonomy.updateTaxonomyTag(assignTag.value.id, {
      parentId: assignParentId.value,
    });
    message.success("Родитель назначен");
    assignModalOpen.value = false;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

const deleteGroupChildCount = computed(() => groupChildren().length);

const deleteGroupHasChildren = computed(() => deleteGroupChildCount.value > 0);

function openDeleteGroupModal(scopeKey: string, tag: TaxonomyTag) {
  taxonomy.selectGroup(scopeKey, tag.id);
  deleteStrategy.value = "CASCADE";
  deleteNewParentId.value = undefined;
  deleteModalOpen.value = true;
}

function closeDeleteGroupModal() {
  deleteModalOpen.value = false;
  deleteNewParentId.value = undefined;
}

async function onDeleteGroup() {
  const group = selectedGroup.value;
  if (!group) {
    return;
  }
  const strategy = deleteGroupHasChildren.value ? deleteStrategy.value : "CASCADE";
  if (strategy === "REASSIGN" && !deleteNewParentId.value) {
    message.warning("Выберите группу для переноса подтегов");
    return;
  }
  try {
    await taxonomy.deleteTaxonomyGroup(
      group.id,
      strategy,
      strategy === "REASSIGN" ? deleteNewParentId.value : null,
    );
    message.success("Удалено");
    closeDeleteGroupModal();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  }
}

async function deleteTag(id: string) {
  try {
    await taxonomy.deleteTaxonomyTag(id);
    message.success("Удалено");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

function isGroup(record: TaxonomyTag) {
  return (record.childIds?.length ?? record.children?.length ?? 0) > 0;
}

function isGroupSelected(scopeKey: string, tagId: string) {
  return selectedScopeKey.value === scopeKey && selectedGroupId.value === tagId;
}

function onGraphSelectTag(tag: TaxonomyTag) {
  graphSelectedTag.value = tag;
  if (!isTaxonomyScopeTreeNode(tag) && isGroup(tag)) {
    taxonomy.selectGroup(tag.scopeKey, tag.id);
  }
}

function clearGraphSelection() {
  graphSelectedTag.value = null;
}

watch(directoryViewMode, mode => {
  if (mode === "tables") {
    clearGraphSelection();
  }
});

const hierarchyColumns: ColumnsType<TaxonomyTag> = [
  { title: "Название", dataIndex: "label", key: "label" },
  { title: "Ключ", dataIndex: "key", key: "key" },
  { title: "Тип", dataIndex: "namespace", key: "namespace", width: 140 },
  { title: "Действия", key: "actions", width: 300 },
];

const ungroupedColumns: ColumnsType<TaxonomyTag> = [
  { title: "Подпись", dataIndex: "label", key: "label" },
  { title: "Ключ", dataIndex: "key", key: "key" },
  { title: "Тип", dataIndex: "namespace", key: "namespace" },
  { title: "", key: "actions", width: 240 },
];

const childColumns: ColumnsType<TaxonomyTag> = [
  { title: "Подпись", dataIndex: "label", key: "label" },
  { title: "Ключ", dataIndex: "key", key: "key" },
  { title: "Тип", dataIndex: "namespace", key: "namespace", width: 140 },
  { title: "", key: "actions", width: 120 },
];
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
      <Space align="center" style="width: 100%; justify-content: space-between" wrap>
        <Title :level="3" style="margin: 0">Справочник таксономии</Title>
        <Space wrap>
          <Segmented
            :value="directoryViewMode"
            :options="[
              { label: 'Таблицы', value: 'tables' },
              { label: 'Data Graph', value: 'graph' },
            ]"
            @change="value => (directoryViewMode = value as DirectoryViewMode)"
          />
          <Button @click="scopeModalOpen = true">Добавить раздел</Button>
        </Space>
      </Space>

      <Alert v-if="error" type="error" show-icon :message="error" />

      <Alert
        v-else-if="!directoriesLoaded && !loading"
        type="warning"
        show-icon
        message="Иерархия не загружена"
        description="Дерево тегов приходит из запроса MstTaxonomyForest (taxonomyForest), а не из MstTaxonomyScopes. Обновите страницу."
      />

      <Text type="secondary">
        {{
          directoryViewMode === "tables"
            ? "Каждый раздел — отдельная таблица корневых тегов и иерархии (данные taxonomyForest). Разделы задаются кнопкой «Добавить раздел»."
            : "Общее дерево: разделы таксономии и их иерархии на одном канвасе. Клик по узлу — карточка поверх графа."
        }}
      </Text>

      <Card
        v-if="directoryViewMode === 'graph' && scopeSections.length > 0"
        title="Общее дерево таксономии"
      >
        <TaxonomyGlobalGraphView
          v-if="directoriesLoaded"
          :sections="scopeSections"
          :loading="loading"
          :selected-tag="graphSelectedTag"
          :is-group="isGroup"
          :is-group-selected="isGroupSelected"
          :is-deletable-as-group="isDeletableAsGroup"
          :scope-label="scopeLabel"
          @select="onGraphSelectTag"
          @close="clearGraphSelection"
          @add-root-tag="scopeKey => openCreateTag(scopeKey, null)"
          @view-composition="(scopeKey, tagId) => taxonomy.selectGroup(scopeKey, tagId)"
          @add-child="(scopeKey, parentId) => openCreateTag(scopeKey, parentId)"
          @delete-group="(scopeKey, tag) => openDeleteGroupModal(scopeKey, tag)"
          @delete-tag="deleteTag"
        />
        <Alert
          v-else
          type="info"
          show-icon
          message="Загрузка иерархии…"
        />
      </Card>

      <template v-if="directoryViewMode === 'tables'">
      <Collapse
        v-if="scopeSections.length > 0"
        v-model:activeKey="hierarchyCollapseKeys"
        style="background: #fff"
      >
        <Collapse.Panel
          v-for="section in scopeSections"
          :key="section.scope.key"
          :panel-key="section.scope.key"
        >
          <template #header>
            <Space :size="8" wrap @click.stop>
              <span>Иерархия раздела «{{ section.scope.label }}»</span>
              <Tag color="processing" style="margin: 0; font-family: monospace">
                {{ scopeKeyDotPrefix(section.scope.key) }}
              </Tag>
            </Space>
          </template>
          <Text type="secondary" style="display: block; margin-bottom: 12px">
            {{ hierarchyHint(section.scope.key) }}
          </Text>

          <Table
            v-if="directoriesLoaded"
            row-key="id"
            :loading="loading"
            :columns="hierarchyColumns"
            :data-source="section.hierarchyRoots"
            :pagination="false"
            :children-column-name="'children'"
            :default-expand-all-rows="true"
          >
              <template #headerCell="{ column }">
                <template v-if="column.key === 'actions'">
                  <Space :size="8">
                    <span>Действия</span>
                    <Button
                      type="primary"
                      size="small"
                      @click.stop="openCreateTag(section.scope.key, null)"
                    >
                      {{ rootCreateButtonLabel(section.scope.key) }}
                    </Button>
                  </Space>
                </template>
              </template>
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'key'">
                  <Text code>{{ (row as TaxonomyTag).key }}</Text>
                </template>
                <template v-else-if="column.key === 'namespace'">
                  <Tag>{{ taxonomyTagNamespaceLabel((row as TaxonomyTag).namespace) }}</Tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space size="small">
                    <Button
                      v-if="isGroup(row as TaxonomyTag)"
                      size="small"
                      :type="
                        isGroupSelected(section.scope.key, (row as TaxonomyTag).id)
                          ? 'primary'
                          : 'default'
                      "
                      @click="taxonomy.selectGroup(section.scope.key, (row as TaxonomyTag).id)"
                    >
                      Состав
                    </Button>
                    <Button
                      size="small"
                      @click="openCreateTag(section.scope.key, (row as TaxonomyTag).id)"
                    >
                      {{ childCreateButtonLabel(section.scope.key) }}
                    </Button>
                    <Button
                      v-if="isDeletableAsGroup(row as TaxonomyTag, section.scope.key)"
                      size="small"
                      danger
                      @click="openDeleteGroupModal(section.scope.key, row as TaxonomyTag)"
                    >
                      {{
                        isGroup(row as TaxonomyTag) ? "Удалить группу" : "Удалить"
                      }}
                    </Button>
                    <Popconfirm
                      v-else
                      title="Удалить этот тег?"
                      ok-text="Удалить"
                      cancel-text="Отмена"
                      @confirm="deleteTag((row as TaxonomyTag).id)"
                    >
                      <Button size="small" danger>Удалить</Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
          </Table>
        </Collapse.Panel>
      </Collapse>

      <template v-for="section in scopeSections" :key="`ungrouped-${section.scope.key}`">
        <Card
          v-if="section.ungroupedTags.length > 0"
          :title="`Несгруппированные — «${section.scope.label}» (${section.ungroupedTags.length})`"
        >
          <template #extra>
            <Text type="secondary">
              {{
                section.scope.key === "crop"
                  ? "Тег без родителя в crop — привяжите к узлу crop.* или удалите"
                  : "Теги без родителя — назначьте группу или удалите"
              }}
            </Text>
          </template>
          <Table
            row-key="id"
            :columns="ungroupedColumns"
            :data-source="section.ungroupedTags"
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
                  <Button
                    size="small"
                    type="primary"
                    @click="openAssignGroup(section.scope.key, row as TaxonomyTag)"
                  >
                    Назначить родителя
                  </Button>
                  <Popconfirm
                    title="Удалить этот тег?"
                    ok-text="Удалить"
                    cancel-text="Отмена"
                    @confirm="deleteTag((row as TaxonomyTag).id)"
                  >
                    <Button size="small" danger>Удалить</Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </Card>
      </template>
      </template>

      <Card
        v-if="selectedGroup"
        :title="`Состав группы «${selectedGroup.label}» (${scopeLabel(selectedGroup.scopeKey)})`"
      >
        <template #extra>
          <Space>
            <Button @click="openCreateTag(selectedGroup.scopeKey, selectedGroup.id)">
              {{ childCreateButtonLabel(selectedGroup.scopeKey) }}
            </Button>
            <Button
              danger
              @click="openDeleteGroupModal(selectedGroup.scopeKey, selectedGroup)"
            >
              Удалить группу
            </Button>
          </Space>
        </template>
        <Table
          row-key="id"
          :columns="childColumns"
          :data-source="groupChildren()"
          :pagination="false"
          :locale="{ emptyText: 'В этой группе пока нет подтегов.' }"
        >
          <template #bodyCell="{ column, record: row }">
            <template v-if="column.key === 'namespace'">
              <Tag>{{ taxonomyTagNamespaceLabel((row as TaxonomyTag).namespace) }}</Tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <Popconfirm
                title="Удалить этот тег?"
                ok-text="Удалить"
                cancel-text="Отмена"
                @confirm="deleteTag((row as TaxonomyTag).id)"
              >
                <Button size="small" danger>Удалить</Button>
              </Popconfirm>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        :title="tagModalTitle"
        :open="tagModalOpen"
        @cancel="tagModalOpen = false"
        @ok="onCreateTag"
      >
        <Form layout="vertical" @finish="onCreateTag">
          <Form.Item
            label="Ключ (dot-нотация)"
            required
            :validate-status="tagFormKeyError ? 'error' : undefined"
            :help="createTagKeyHelp"
          >
            <Input
              v-model:value="tagForm.key"
              @update:value="clearTagFormKeyError"
              @press-enter="onCreateTag"
              :placeholder="createTagKeyPlaceholder"
            >
              <template #addonAfter>
                <Text code style="font-size: 12px">{{ createTagKeyPreview }}</Text>
              </template>
            </Input>
          </Form.Item>
          <Form.Item v-if="namespaceLocked" label="Тип">
            <Tag color="blue">{{ lockedNamespaceLabel }}</Tag>
          </Form.Item>
          <Form.Item
            v-if="showVariantAxisField(actionScopeKey, tagForm.namespace, createParentId)"
            label="Ось варианта"
          >
            <Input
              v-model:value="tagForm.variantAxis"
              placeholder="growth_habit / pollination"
              @press-enter="onCreateTag"
            />
          </Form.Item>
          <Form.Item label="Подпись" required>
            <Input
              v-model:value="tagForm.label"
              :placeholder="createParentId ? 'Подпись подтега' : 'Томаты'"
              @press-enter="onCreateTag"
            />
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
            <Input
              v-model:value="scopeForm.key"
              placeholder="product"
              @press-enter="onCreateScope"
            />
          </Form.Item>
          <Form.Item label="Подпись" required>
            <Input
              v-model:value="scopeForm.label"
              placeholder="Метки продуктов"
              @press-enter="onCreateScope"
            />
          </Form.Item>
          <Form.Item label="Описание">
            <Input.TextArea v-model:value="scopeForm.description" :rows="2" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        :title="
          assignTag ? `Назначить родителя для «${assignTag.label}»` : 'Назначить родителя'
        "
        :open="assignModalOpen"
        ok-text="Сохранить"
        @cancel="assignModalOpen = false"
        @ok="onAssignGroup"
      >
        <Text type="secondary" style="display: block; margin-bottom: 12px">
          Раздел «{{ scopeLabel(actionScopeKey) }}».
        </Text>
        <Select
          allow-clear
          placeholder="Родитель (корневой тег раздела)"
          style="width: 100%"
          :options="groupParentOptions(flatTagsForScope(actionScopeKey), actionScopeKey)"
          v-model:value="assignParentId"
        />
      </Modal>

      <Modal
        :title="
          selectedGroup ? `Удаление группы «${selectedGroup.label}»` : 'Удаление группы'
        "
        :open="deleteModalOpen"
        ok-text="Подтвердить"
        :ok-button-props="{ danger: true }"
        @cancel="closeDeleteGroupModal"
        @ok="onDeleteGroup"
      >
        <template v-if="deleteGroupHasChildren">
          <Text type="secondary" style="display: block; margin-bottom: 12px">
            В группе {{ deleteGroupChildCount }} подтег(ов). Выберите, что с ними сделать.
          </Text>
          <Radio.Group
            v-model:value="deleteStrategy"
            style="display: flex; flex-direction: column; gap: 8px"
          >
            <Radio
              v-for="key in (Object.keys(DELETE_STRATEGY_LABELS) as TaxonomyGroupDeleteStrategy[])"
              :key="key"
              :value="key"
            >
              {{ DELETE_STRATEGY_LABELS[key] }}
            </Radio>
          </Radio.Group>
          <Select
            v-if="deleteStrategy === 'REASSIGN' && selectedGroup"
            allow-clear
            placeholder="Новая группа"
            style="width: 100%; margin-top: 12px"
            :options="
              parentOptionsForScope(selectedGroup.scopeKey).filter(
                o => o.value !== selectedGroup?.id,
              )
            "
            v-model:value="deleteNewParentId"
          />
        </template>
        <Text v-else type="secondary">
          У узла «{{ selectedGroup?.label }}» ({{ selectedGroup?.key }}) нет подтегов.
          Удалить его из справочника?
        </Text>
      </Modal>
  </Space>
</template>
