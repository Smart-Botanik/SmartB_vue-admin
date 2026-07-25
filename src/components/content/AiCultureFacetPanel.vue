<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import {
  aiApi,
  type AiGeneration,
  type AiGenerationOutput,
} from "@/api/content/aiApi";

export type CultureFacetAiTexts = {
  hubLead: string;
  aboutShort: string;
  seoDescription: string;
  hubTitle?: string;
};

const props = defineProps<{
  subjectKey?: string;
  displayName?: string;
  current: {
    hubTitle: string;
    hubLead: string;
    aboutShort: string;
    seoDescription: string;
  };
}>();

const emit = defineEmits<{
  apply: [texts: CultureFacetAiTexts];
}>();

const { Text, Paragraph } = Typography;

const notes = ref("");
const loading = ref(false);
const listLoading = ref(false);
const generations = ref<AiGeneration[]>([]);
const applyTarget = ref<AiGeneration | null>(null);

const enabled = computed(() => Boolean(props.subjectKey));

const confirmOpen = computed({
  get: () => Boolean(applyTarget.value),
  set: (v: boolean) => {
    if (!v) applyTarget.value = null;
  },
});

const overwriteFields = computed(() => {
  const out = applyTarget.value?.output;
  if (!out) return [] as string[];
  const fields: string[] = [];
  if (out.hubLead && props.current.hubLead.trim()) fields.push("Hub lead");
  if (out.aboutShort && props.current.aboutShort.trim()) {
    fields.push("About short");
  }
  if (out.seoDescription && props.current.seoDescription.trim()) {
    fields.push("SEO description");
  }
  return fields;
});

function visibleGenerations(rows: AiGeneration[]) {
  return rows.filter(row => row.status !== "DISCARDED");
}

async function loadList() {
  if (!props.subjectKey) {
    generations.value = [];
    return;
  }
  listLoading.value = true;
  try {
    const rows = await aiApi.listGenerations({
      kind: "CULTURE_FACET_DESCRIPTION",
      targetKey: props.subjectKey,
      limit: 20,
    });
    generations.value = visibleGenerations(rows);
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    listLoading.value = false;
  }
}

async function generate() {
  if (!props.subjectKey) {
    message.error("Сначала выберите культуру");
    return;
  }
  loading.value = true;
  try {
    const row = await aiApi.generateCultureFacetDescription({
      subjectKey: props.subjectKey,
      displayName: props.displayName,
      notes: notes.value.trim() || undefined,
      locale: "ru-RU",
    });
    if (row.status === "FAILED") {
      message.error(
        row.errorMessage ||
          "Генерация не удалась. Проверьте GROQ_API_KEY на ai-service.",
      );
    } else {
      message.success("Черновик текстов сгенерирован");
    }
    await loadList();
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

function askApply(row: AiGeneration) {
  if (!row.output?.hubLead || !row.output?.aboutShort || !row.output?.seoDescription) {
    message.error("В черновике нет обязательных полей hubLead / aboutShort / seoDescription");
    return;
  }
  applyTarget.value = row;
}

function buildApplyPayload(output: AiGenerationOutput): CultureFacetAiTexts {
  const texts: CultureFacetAiTexts = {
    hubLead: output.hubLead?.trim() || "",
    aboutShort: output.aboutShort?.trim() || "",
    seoDescription: output.seoDescription?.trim() || "",
  };
  const hubTitle = output.hubTitle?.trim();
  if (hubTitle && !props.current.hubTitle.trim()) {
    texts.hubTitle = hubTitle;
  }
  return texts;
}

function confirmApply() {
  if (!applyTarget.value?.output) return;
  const texts = buildApplyPayload(applyTarget.value.output);
  emit("apply", texts);
  applyTarget.value = null;
  message.success("Тексты подставлены в форму — сохраните профиль");
}

async function discard(row: AiGeneration) {
  try {
    await aiApi.discardGeneration(row.id);
    message.success("Черновик отклонён");
    await loadList();
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  }
}

function statusColor(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return "blue";
    case "APPLIED":
      return "green";
    case "FAILED":
      return "red";
    case "DISCARDED":
      return "default";
    default:
      return "orange";
  }
}

function previewLead(row: AiGeneration) {
  return (
    row.output?.hubLead ||
    row.output?.aboutShort ||
    row.errorMessage ||
    "—"
  );
}

watch(
  () => props.subjectKey,
  () => {
    notes.value = "";
    void loadList();
  },
  { immediate: true },
);
</script>

<template>
  <Card class="ai-culture-panel" size="small" :bordered="false">
    <template #title>
      <div class="ai-culture-panel__title">
        <span class="ai-culture-panel__badge">AI</span>
        <span>Тексты культуры</span>
      </div>
    </template>

    <Alert
      v-if="!enabled"
      type="info"
      show-icon
      class="ai-culture-panel__alert"
      message="Выберите культуру, чтобы генерировать тексты"
    />

    <Space v-else direction="vertical" class="ai-culture-panel__body" :size="14">
      <Text type="secondary" class="ai-culture-panel__hint">
        Черновик для
        <Text code>{{ subjectKey }}</Text>
        · Hub lead, About short, SEO description → в форму → Save / Publish
      </Text>

      <Input.TextArea
        v-model:value="notes"
        class="ai-culture-panel__notes"
        :rows="2"
        :disabled="loading"
        placeholder="Заметки редактора для промпта (тон, акцент, чего избегать)"
      />

      <div class="ai-culture-panel__actions">
        <Button type="primary" :loading="loading" @click="generate">
          Сгенерировать черновик
        </Button>
      </div>

      <Spin :spinning="listLoading">
        <div v-if="generations.length === 0" class="ai-culture-panel__empty">
          <Empty
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="Нет черновиков для этой культуры"
          />
        </div>

        <ul v-else class="ai-culture-panel__list">
          <li
            v-for="item in generations"
            :key="item.id"
            class="ai-draft"
            :class="{
              'ai-draft--failed': item.status === 'FAILED',
              'ai-draft--ok': item.status === 'SUCCEEDED' || item.status === 'APPLIED',
            }"
          >
            <div class="ai-draft__head">
              <Space :size="8" wrap>
                <Tag :color="statusColor(item.status)">{{ item.status }}</Tag>
                <Text type="secondary" class="ai-draft__meta">
                  {{ item.promptVersion }} · {{ item.model || "—" }}
                </Text>
              </Space>
              <Space :size="4">
                <Button
                  v-if="item.status === 'SUCCEEDED' || item.status === 'APPLIED'"
                  type="link"
                  size="small"
                  @click="askApply(item)"
                >
                  В форму
                </Button>
                <Button
                  v-if="item.status === 'SUCCEEDED' || item.status === 'FAILED'"
                  type="link"
                  size="small"
                  danger
                  @click="discard(item)"
                >
                  Отклонить
                </Button>
              </Space>
            </div>

            <Paragraph
              v-if="item.status === 'FAILED'"
              type="danger"
              class="ai-draft__error"
              :ellipsis="{ rows: 3 }"
            >
              {{ item.errorMessage || "Ошибка генерации" }}
            </Paragraph>
            <template v-else>
              <div class="ai-draft__fields">
                <div class="ai-draft__field">
                  <span class="ai-draft__label">Lead</span>
                  <Paragraph
                    :ellipsis="{ rows: 2 }"
                    class="ai-draft__text"
                  >
                    {{ previewLead(item) }}
                  </Paragraph>
                </div>
                <div v-if="item.output?.seoDescription" class="ai-draft__field">
                  <span class="ai-draft__label">SEO</span>
                  <Paragraph
                    :ellipsis="{ rows: 1 }"
                    class="ai-draft__text"
                  >
                    {{ item.output.seoDescription }}
                  </Paragraph>
                </div>
              </div>
            </template>
          </li>
        </ul>
      </Spin>
    </Space>

    <Modal
      v-model:open="confirmOpen"
      title="Подставить AI-тексты в форму?"
      ok-text="Подставить"
      cancel-text="Отмена"
      @ok="confirmApply"
    >
      <div v-if="applyTarget?.output" class="ai-apply-preview">
        <Alert
          v-if="overwriteFields.length"
          type="warning"
          show-icon
          class="ai-culture-panel__alert"
          :message="`Будут перезаписаны: ${overwriteFields.join(', ')}`"
        />
        <Alert
          v-else
          type="info"
          show-icon
          class="ai-culture-panel__alert"
          message="Пустые поля формы заполнятся из черновика"
        />

        <div class="ai-apply-preview__block">
          <Text strong>Hub lead</Text>
          <pre class="ai-apply-preview__pre">{{
            applyTarget.output.hubLead || "—"
          }}</pre>
        </div>
        <div class="ai-apply-preview__block">
          <Text strong>About short</Text>
          <pre class="ai-apply-preview__pre">{{
            applyTarget.output.aboutShort || "—"
          }}</pre>
        </div>
        <div class="ai-apply-preview__block">
          <Text strong>SEO description</Text>
          <pre class="ai-apply-preview__pre">{{
            applyTarget.output.seoDescription || "—"
          }}</pre>
        </div>
        <Paragraph v-if="applyTarget.output.hubTitle" type="secondary">
          hubTitle «{{ applyTarget.output.hubTitle }}»
          {{
            current.hubTitle.trim()
              ? "— не трогаем (поле уже заполнено)"
              : "— подставим, поле пустое"
          }}
        </Paragraph>
      </div>
    </Modal>
  </Card>
</template>

<style scoped>
.ai-culture-panel {
  background: linear-gradient(165deg, #f7faf8 0%, #f0f5f2 48%, #eef2f6 100%);
  border: 1px solid #d9e2dc;
  border-radius: 10px;
  overflow: hidden;
}

.ai-culture-panel :deep(.ant-card-head) {
  min-height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid #d9e2dc;
  background: rgba(255, 255, 255, 0.55);
}

.ai-culture-panel :deep(.ant-card-body) {
  padding: 14px;
}

.ai-culture-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.ai-culture-panel__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #0f5132;
  background: #d1e7dd;
  border: 1px solid #a3cfbb;
}

.ai-culture-panel__body {
  width: 100%;
}

.ai-culture-panel__hint {
  display: block;
  font-size: 12px;
  line-height: 1.45;
}

.ai-culture-panel__notes :deep(textarea) {
  border-radius: 8px;
  background: #fff;
}

.ai-culture-panel__actions {
  display: flex;
  justify-content: flex-start;
}

.ai-culture-panel__alert {
  margin-bottom: 0;
}

.ai-culture-panel__empty {
  padding: 8px 0 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

.ai-culture-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-draft {
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e6ebe8;
  box-shadow: 0 1px 2px rgba(15, 40, 30, 0.04);
}

.ai-draft--ok {
  border-left: 3px solid #1677ff;
}

.ai-draft--failed {
  border-left: 3px solid #ff4d4f;
  background: #fff8f8;
}

.ai-draft__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.ai-draft__meta {
  font-size: 11px;
}

.ai-draft__error {
  margin-bottom: 0 !important;
  white-space: pre-wrap;
}

.ai-draft__fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-draft__field {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
  align-items: start;
}

.ai-draft__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #8c8c8c;
  padding-top: 2px;
}

.ai-draft__text {
  margin-bottom: 0 !important;
  white-space: pre-wrap;
  color: rgba(0, 0, 0, 0.78);
}

.ai-apply-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-apply-preview__block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-apply-preview__pre {
  margin: 0;
  max-height: 120px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f5f5f5;
  border: 1px solid #f0f0f0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
}
</style>
