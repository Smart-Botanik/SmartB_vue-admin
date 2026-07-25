<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import {
  calendarDayApi,
  type CalendarDay,
  type CalendarDayGeneralState,
  type ContentStatus,
} from "@/api/content/calendarDayApi";
import type { LunarFacts } from "@/api/content/aiApi";
import LunarFactsBanner from "@/components/calendar/LunarFactsBanner.vue";
import AiGenerationPanel from "@/components/calendar/AiGenerationPanel.vue";

const { Title } = Typography;
const route = useRoute();
const router = useRouter();

const dateKey = computed(() => String(route.params.date ?? ""));
const loading = ref(false);
const saving = ref(false);
const day = ref<CalendarDay | null>(null);

const formModel = ref({
  title: "",
  bodyMd: "",
  moonPhase: "",
  moonZodiacSign: "",
  generalState: "NEUTRAL" as CalendarDayGeneralState,
});

const GENERAL_OPTIONS = [
  { value: "GOOD", label: "GOOD" },
  { value: "NEUTRAL", label: "NEUTRAL" },
  { value: "BAD", label: "BAD" },
];

const PHASE_OPTIONS = [
  "new",
  "waxing_crescent",
  "first_quarter",
  "waxing_gibbous",
  "full",
  "waning_gibbous",
  "last_quarter",
  "waning_crescent",
].map((v) => ({ value: v, label: v }));

const ZODIAC_OPTIONS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
].map((v) => ({ value: v, label: v }));

function applyDayToForm(item: CalendarDay | null) {
  day.value = item;
  formModel.value = {
    title: item?.title ?? "",
    bodyMd: item?.bodyMd ?? "",
    moonPhase: item?.moonPhase ?? "",
    moonZodiacSign: item?.moonZodiacSign ?? "",
    generalState: item?.generalState ?? "NEUTRAL",
  };
}

async function load() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey.value)) {
    message.error("Некорректная дата");
    await router.push("/content/calendar-days");
    return;
  }
  loading.value = true;
  try {
    const item = await calendarDayApi.getDay(dateKey.value);
    applyDayToForm(item);
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

function onFillFacts(facts: LunarFacts) {
  formModel.value.moonPhase = facts.moonPhase;
  formModel.value.moonZodiacSign = facts.moonZodiacSign;
}

async function save(status?: ContentStatus) {
  saving.value = true;
  try {
    const saved = await calendarDayApi.upsertDay({
      date: dateKey.value,
      title: formModel.value.title || null,
      bodyMd: formModel.value.bodyMd,
      moonPhase: formModel.value.moonPhase || null,
      moonZodiacSign: formModel.value.moonZodiacSign || null,
      generalState: formModel.value.generalState,
      status: status ?? day.value?.status ?? "DRAFT",
    });
    applyDayToForm(saved);
    message.success("День сохранён");
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

async function publish() {
  saving.value = true;
  try {
    await save("DRAFT");
    const published = await calendarDayApi.publishDay(dateKey.value);
    applyDayToForm(published);
    message.success("Опубликовано");
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

async function unpublish() {
  saving.value = true;
  try {
    const item = await calendarDayApi.unpublishDay(dateKey.value);
    applyDayToForm(item);
    message.success("Снято с публикации");
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

function onApplied(item: CalendarDay) {
  applyDayToForm(item);
}

onMounted(load);
watch(dateKey, load);
</script>

<template>
  <div>
    <Space style="margin-bottom: 16px" wrap>
      <Button @click="router.push('/content/calendar-days')">← К сетке</Button>
      <Title :level="3" style="margin: 0">День {{ dateKey }}</Title>
      <Tag v-if="day" :color="day.status === 'PUBLISHED' ? 'green' : 'default'">
        {{ day.status }}
      </Tag>
      <Tag v-else color="orange">новый</Tag>
    </Space>

    <Space direction="vertical" style="width: 100%" :size="16">
      <LunarFactsBanner :date="dateKey" @fill="onFillFacts" />

      <Card :loading="loading">
        <Form layout="vertical">
          <Form.Item label="Заголовок">
            <Input v-model:value="formModel.title" />
          </Form.Item>
          <Form.Item label="Описание (Markdown)">
            <Input.TextArea v-model:value="formModel.bodyMd" :rows="8" />
          </Form.Item>
          <Space wrap style="width: 100%">
            <Form.Item label="Фаза Луны" style="min-width: 200px">
              <Select
                v-model:value="formModel.moonPhase"
                :options="PHASE_OPTIONS"
                allow-clear
                style="width: 200px"
              />
            </Form.Item>
            <Form.Item label="Знак зодиака" style="min-width: 200px">
              <Select
                v-model:value="formModel.moonZodiacSign"
                :options="ZODIAC_OPTIONS"
                allow-clear
                style="width: 200px"
              />
            </Form.Item>
            <Form.Item label="Общий тон" style="min-width: 160px">
              <Select
                v-model:value="formModel.generalState"
                :options="GENERAL_OPTIONS"
                style="width: 160px"
              />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" :loading="saving" @click="save()">
              Сохранить
            </Button>
            <Button :loading="saving" @click="publish">Опубликовать</Button>
            <Button
              v-if="day?.status === 'PUBLISHED'"
              :loading="saving"
              @click="unpublish"
            >
              Снять с публикации
            </Button>
          </Space>
        </Form>
      </Card>

      <AiGenerationPanel
        :date="dateKey"
        :current-day="day"
        @applied="onApplied"
      />
    </Space>
  </div>
</template>
