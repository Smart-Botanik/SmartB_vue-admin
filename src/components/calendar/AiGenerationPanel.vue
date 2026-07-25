<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  Button,
  Card,
  Input,
  List,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import {
  aiApi,
  type AiGeneration,
} from "@/api/content/aiApi";
import type { CalendarDay } from "@/api/content/calendarDayApi";

const props = defineProps<{
  date: string;
  currentDay: CalendarDay | null;
}>();

const emit = defineEmits<{
  applied: [day: CalendarDay];
}>();

const { Text, Paragraph } = Typography;
const notes = ref("");
const loading = ref(false);
const listLoading = ref(false);
const generations = ref<AiGeneration[]>([]);
const applyTarget = ref<AiGeneration | null>(null);
const applying = ref(false);

const confirmOpen = computed({
  get: () => Boolean(applyTarget.value),
  set: (v: boolean) => {
    if (!v) applyTarget.value = null;
  },
});

async function loadList() {
  listLoading.value = true;
  try {
    generations.value = await aiApi.listGenerations({
      targetDate: props.date,
      limit: 20,
    });
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    listLoading.value = false;
  }
}

async function generate() {
  loading.value = true;
  try {
    const row = await aiApi.generateLunarDay({
      date: props.date,
      timezone: "UTC",
      notes: notes.value.trim() || undefined,
    });
    if (row.status === "FAILED") {
      message.error(row.errorMessage || "Генерация не удалась");
    } else {
      message.success("Черновик сгенерирован");
    }
    await loadList();
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

function askApply(row: AiGeneration) {
  applyTarget.value = row;
}

async function confirmApply() {
  if (!applyTarget.value) return;
  applying.value = true;
  try {
    const day = await aiApi.applyGeneration(applyTarget.value.id, true);
    message.success("Черновик применён к дню (DRAFT)");
    applyTarget.value = null;
    emit("applied", day);
    await loadList();
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    applying.value = false;
  }
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

onMounted(loadList);
watch(() => props.date, loadList);
</script>

<template>
  <Card title="AI: генерация дня" size="small">
    <Space direction="vertical" style="width: 100%" :size="12">
      <Input.TextArea
        v-model:value="notes"
        :rows="2"
        placeholder="Заметки редактора для промпта (необязательно)"
      />
      <Button type="primary" :loading="loading" @click="generate">
        Сгенерировать черновик
      </Button>

      <List
        size="small"
        :loading="listLoading"
        :data-source="generations"
        :locale="{ emptyText: 'Нет черновиков для этой даты' }"
      >
        <template #renderItem="{ item }">
          <List.Item>
            <List.Item.Meta>
              <template #title>
                <Space>
                  <Tag :color="statusColor(item.status)">{{ item.status }}</Tag>
                  <Text>{{ item.output?.title || "Без заголовка" }}</Text>
                </Space>
              </template>
              <template #description>
                <Paragraph
                  :ellipsis="{ rows: 2 }"
                  style="margin-bottom: 0; white-space: pre-wrap"
                >
                  {{ item.output?.bodyMd || item.errorMessage || "—" }}
                </Paragraph>
                <Text type="secondary" style="font-size: 12px">
                  {{ item.promptVersion }} · {{ item.model || "—" }}
                </Text>
              </template>
            </List.Item.Meta>
            <template #actions>
              <Button
                v-if="item.status === 'SUCCEEDED' || item.status === 'APPLIED'"
                type="link"
                size="small"
                @click="askApply(item)"
              >
                Применить
              </Button>
              <Button
                v-if="item.status === 'SUCCEEDED'"
                type="link"
                size="small"
                danger
                @click="discard(item)"
              >
                Отклонить
              </Button>
            </template>
          </List.Item>
        </template>
      </List>
    </Space>

    <Modal
      v-model:open="confirmOpen"
      title="Применить AI-черновик?"
      :confirm-loading="applying"
      ok-text="Применить как DRAFT"
      cancel-text="Отмена"
      @ok="confirmApply"
    >
      <div v-if="applyTarget">
        <Paragraph>
          <Text strong>Новый заголовок:</Text>
          {{ applyTarget.output?.title || "—" }}
        </Paragraph>
        <Paragraph>
          <Text strong>Текущий заголовок:</Text>
          {{ currentDay?.title || "—" }}
        </Paragraph>
        <Paragraph>
          <Text strong>Новый bodyMd:</Text>
        </Paragraph>
        <pre style="white-space: pre-wrap; max-height: 200px; overflow: auto">{{
          applyTarget.output?.bodyMd || "—"
        }}</pre>
        <Paragraph>
          <Text strong>Состояние:</Text>
          {{ applyTarget.output?.suggestedGeneralState || "NEUTRAL" }}
          (сейчас: {{ currentDay?.generalState || "—" }})
        </Paragraph>
      </div>
    </Modal>
  </Card>
</template>
