<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Observer } from "mobx-vue-lite";
import {
  Button,
  Card,
  Form,
  Input,
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

import { useTaxonomyDirectoryBootstrap } from "@/composables/useTaxonomyDirectoryBootstrap";
import type {
  TaxonomyGroupDeleteStrategy,
  TaxonomyTag,
  TaxonomyTagNamespace,
} from "@/types/content";
import {
  DELETE_STRATEGY_LABELS,
  taxonomyTagNamespaceLabel,
} from "@/types/content";
import { getAdminReactBaseUrl } from "@growing/admin-shell";
import {
  childCreateButtonLabel,
  createTagModalTitle,
  cultureParentOptions,
  defaultNamespaceForCreate,
  flattenForest,
  hierarchyHint,
  isIntentionalRoot,
  isNamespaceLocked,
  rootCreateButtonLabel,
} from "./taxonomyDirectoryUtils";

const { Title, Text } = Typography;

const reactFlatTagsHref = `${getAdminReactBaseUrl()}/content/taxonomy-tags`;

const { store } = useTaxonomyDirectoryBootstrap();

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
});

const scopeForm = reactive({
  key: "",
  label: "",
  description: "",
});

function activeScope() {
  return store.taxonomyUi.scopes.find(
    scope => scope.key === store.taxonomyUi.activeScopeKey,
  );
}

function hierarchyRoots() {
  return store.taxonomyUi.forestTree.filter(tag =>
    isIntentionalRoot(tag, store.taxonomyUi.activeScopeKey),
  );
}

function flatTags() {
  return flattenForest(store.taxonomyUi.forestTree);
}

function groupChildren() {
  const group = store.selectedGroup;
  if (!group) {
    return [];
  }
  return flatTags().filter(tag => tag.parentId === group.id);
}

function parentOptions() {
  return flatTags()
    .filter(tag => (tag.childIds?.length ?? tag.children?.length ?? 0) > 0)
    .map(tag => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
}

function assignParentOptions() {
  return cultureParentOptions(flatTags(), store.taxonomyUi.activeScopeKey);
}

const tagModalTitle = computed(() =>
  createTagModalTitle(store.taxonomyUi.activeScopeKey, createParentId.value),
);

const namespaceLocked = computed(() =>
  isNamespaceLocked(store.taxonomyUi.activeScopeKey, createParentId.value),
);

const lockedNamespaceLabel = computed(() =>
  taxonomyTagNamespaceLabel(tagForm.namespace),
);

function onScopeTabChange(key: string | number) {
  store.setActiveScopeKey(String(key));
}

function openCreateTag(parentId: string | null) {
  createParentId.value = parentId;
  tagForm.key = "";
  tagForm.label = "";
  tagForm.namespace = defaultNamespaceForCreate(
    store.taxonomyUi.activeScopeKey,
    parentId,
  );
  tagModalOpen.value = true;
}

async function onCreateTag() {
  const parent = createParentId.value
    ? flatTags().find(tag => tag.id === createParentId.value)
    : undefined;
  const keyPrefix = parent?.key ?? store.taxonomyUi.activeScopeKey;
  const segment = tagForm.key.trim().replace(/^\./, "");
  const fullKey = segment.includes(".") ? segment : `${keyPrefix}.${segment}`;
  try {
    await store.createTaxonomyTag({
      scopeKey: store.taxonomyUi.activeScopeKey,
      key: fullKey,
      namespace: tagForm.namespace,
      label: tagForm.label.trim(),
      sortOrder: 0,
      parentId: createParentId.value,
    });
    message.success("Тег создан");
    tagModalOpen.value = false;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  }
}

async function onCreateScope() {
  try {
    await store.createTaxonomyScope({
      key: scopeForm.key.trim(),
      label: scopeForm.label.trim(),
      description: scopeForm.description.trim() || null,
    });
    message.success("Раздел создан");
    scopeModalOpen.value = false;
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
    message.warning(
      store.taxonomyUi.activeScopeKey === "crop"
        ? "Выберите культуру"
        : "Выберите группу",
    );
    return;
  }
  try {
    await store.updateTaxonomyTag(assignTag.value.id, {
      parentId: assignParentId.value,
    });
    message.success("Родитель назначен");
    assignModalOpen.value = false;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка");
  }
}

async function onDeleteGroup() {
  const group = store.selectedGroup;
  if (!group) {
    return;
  }
  try {
    await store.deleteTaxonomyGroup(
      group.id,
      deleteStrategy.value,
      deleteStrategy.value === "REASSIGN" ? deleteNewParentId.value : null,
    );
    message.success("Группа удалена");
    deleteModalOpen.value = false;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  }
}

async function deleteTag(id: string) {
  try {
    await store.deleteTaxonomyTag(id);
    message.success("Удалено");
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
  <Observer>
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

    <Text type="secondary">{{ hierarchyHint(store.taxonomyUi.activeScopeKey) }}</Text>

    <Tabs
      v-if="store.taxonomyUi.scopes.length > 0"
      :active-key="store.taxonomyUi.activeScopeKey"
      :items="
        store.taxonomyUi.scopes.map(scope => ({ key: scope.key, label: scope.label }))
      "
      @change="onScopeTabChange"
    />

    <Card
      :title="`Иерархия раздела «${activeScope()?.label ?? store.taxonomyUi.activeScopeKey}»`"
    >
      <template #extra>
        <Button type="primary" @click="openCreateTag(null)">
          {{ rootCreateButtonLabel(store.taxonomyUi.activeScopeKey) }}
        </Button>
      </template>
      <Table
        row-key="id"
        :loading="store.taxonomyUi.loading"
        :columns="hierarchyColumns"
        :data-source="hierarchyRoots()"
        :pagination="false"
        :children-column-name="'children'"
      >
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
                  store.selectedGroup?.id === (row as TaxonomyTag).id ? 'primary' : 'default'
                "
                @click="store.selectGroup((row as TaxonomyTag).id)"
              >
                Состав
              </Button>
              <Button size="small" @click="openCreateTag((row as TaxonomyTag).id)">
                {{ childCreateButtonLabel(store.taxonomyUi.activeScopeKey) }}
              </Button>
              <Button
                v-if="isGroup(row as TaxonomyTag)"
                size="small"
                danger
                @click="
                  store.selectGroup((row as TaxonomyTag).id);
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
      v-if="store.taxonomyUi.ungroupedTags.length > 0"
      :title="`Несгруппированные теги (${store.taxonomyUi.ungroupedTags.length})`"
    >
      <template #extra>
        <Text type="secondary">
          {{
            store.taxonomyUi.activeScopeKey === "crop"
              ? "Подвид без культуры-родителя — привяжите к crop.* или удалите"
              : "Теги без родителя — назначьте группу или удалите"
          }}
        </Text>
      </template>
      <Table
        row-key="id"
        :columns="ungroupedColumns"
        :data-source="store.taxonomyUi.ungroupedTags"
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
                {{
                  store.taxonomyUi.activeScopeKey === "crop"
                    ? "Привязать к культуре"
                    : "Назначить группу"
                }}
              </Button>
              <Button size="small" danger @click="deleteTag((row as TaxonomyTag).id)">
                Удалить
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Card v-if="store.selectedGroup" :title="`Состав группы «${store.selectedGroup.label}»`">
      <template #extra>
        <Space>
          <Button @click="openCreateTag(store.selectedGroup!.id)">
            {{ childCreateButtonLabel(store.taxonomyUi.activeScopeKey) }}
          </Button>
          <Button danger @click="deleteModalOpen = true">Удалить группу</Button>
        </Space>
      </template>
      <Table
        row-key="id"
        :columns="childColumns"
        :data-source="groupChildren()"
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'namespace'">
            <Tag>{{ taxonomyTagNamespaceLabel((row as TaxonomyTag).namespace) }}</Tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <Button size="small" danger @click="deleteTag((row as TaxonomyTag).id)">
              Удалить
            </Button>
          </template>
        </template>
        <template #emptyText>В этой группе пока нет подтегов.</template>
      </Table>
    </Card>

    <Modal
      :title="tagModalTitle"
      :open="tagModalOpen"
      @cancel="tagModalOpen = false"
      @ok="onCreateTag"
    >
      <Form layout="vertical" @finish="onCreateTag">
        <Form.Item label="Ключ (сегмент)" required>
          <Input
            v-model:value="tagForm.key"
            :placeholder="
              createParentId
                ? 'determinate'
                : store.taxonomyUi.activeScopeKey === 'crop'
                  ? 'tomato'
                  : 'topic.growing'
            "
          />
          <Text type="secondary" style="font-size: 12px">
            {{
              createParentId
                ? "Префикс — ключ родительской культуры (crop.tomato → crop.tomato.determinate)"
                : "Префикс раздела или crop → полный ключ crop.<slug>"
            }}
          </Text>
        </Form.Item>
        <Form.Item v-if="namespaceLocked" label="Тип">
          <Tag color="blue">{{ lockedNamespaceLabel }}</Tag>
        </Form.Item>
        <Form.Item label="Подпись" required>
          <Input
            v-model:value="tagForm.label"
            :placeholder="
              createParentId ? 'Детерминантный' : 'Томаты'
            "
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
      :title="
        assignTag
          ? store.taxonomyUi.activeScopeKey === 'crop'
            ? `Привязать «${assignTag.label}» к культуре`
            : `Назначить группу для «${assignTag.label}»`
          : 'Назначить родителя'
      "
      :open="assignModalOpen"
      ok-text="Сохранить"
      @cancel="assignModalOpen = false"
      @ok="onAssignGroup"
    >
      <Text type="secondary" style="display: block; margin-bottom: 12px">
        {{
          store.taxonomyUi.activeScopeKey === "crop"
            ? "Выберите культуру (корневой CROP), под которую поместить подвид."
            : `Выберите группу в разделе «${activeScope()?.label ?? store.taxonomyUi.activeScopeKey}».`
        }}
      </Text>
      <Select
        allow-clear
        :placeholder="store.taxonomyUi.activeScopeKey === 'crop' ? 'Культура (crop.*)' : 'Группа-родитель'"
        style="width: 100%"
        :options="assignParentOptions()"
        v-model:value="assignParentId"
      />
    </Modal>

    <Modal
      :title="
        store.selectedGroup
          ? `Удаление группы «${store.selectedGroup.label}»`
          : 'Удаление группы'
      "
      :open="deleteModalOpen"
      ok-text="Подтвердить"
      :ok-button-props="{ danger: true }"
      @cancel="deleteModalOpen = false"
      @ok="onDeleteGroup"
    >
      <Text type="secondary" style="display: block; margin-bottom: 12px">
        В группе {{ groupChildren().length }} подтег(ов). Выберите, что с ними сделать.
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
        :options="parentOptions().filter(o => o.value !== store.selectedGroup?.id)"
        v-model:value="deleteNewParentId"
      />
    </Modal>
    </Space>
  </Observer>
</template>
