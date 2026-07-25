<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Button,
  Card,
  Checkbox,
  Form,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import {
  calendarDayApi,
  type CalendarDayListItem,
} from "@/api/content/calendarDayApi";
import { aiApi } from "@/api/content/aiApi";

const { Title, Text } = Typography;
const router = useRouter();

const now = new Date();
const year = ref(now.getFullYear());
const monthIndex = ref(now.getMonth()); // 0-11
const loading = ref(false);
const days = ref<CalendarDayListItem[]>([]);
const backfillLoading = ref(false);
const dryRun = ref(true);
const skipExisting = ref(true);
const autoApply = ref(true);
const backfillLimit = ref(31);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

const fromKey = computed(() => formatKey(year.value, monthIndex.value, 1));
const toKey = computed(() =>
  formatKey(year.value, monthIndex.value, daysInMonth(year.value, monthIndex.value)),
);

const monthOptions = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
].map((label, value) => ({ label, value }));

const yearOptions = Array.from({ length: 6 }, (_, i) => {
  const y = now.getFullYear() - 1 + i;
  return { label: String(y), value: y };
});

const dayMap = computed(() => {
  const map = new Map<string, CalendarDayListItem>();
  for (const d of days.value) map.set(d.date, d);
  return map;
});

const cells = computed(() => {
  const totalDays = daysInMonth(year.value, monthIndex.value);
  const first = new Date(year.value, monthIndex.value, 1);
  const pad = (first.getDay() + 6) % 7;
  const items: Array<{ key: string; date: string | null; label: string }> = [];
  for (let i = 0; i < pad; i += 1) {
    items.push({ key: `pad-${i}`, date: null, label: "" });
  }
  for (let d = 1; d <= totalDays; d += 1) {
    const date = formatKey(year.value, monthIndex.value, d);
    items.push({ key: date, date, label: String(d) });
  }
  return items;
});

function stateColor(state?: string) {
  if (state === "GOOD") return "#d9f7be";
  if (state === "BAD") return "#ffccc7";
  if (state === "NEUTRAL") return "#fff1b8";
  return "#fafafa";
}

function todayKey() {
  const t = new Date();
  return formatKey(t.getFullYear(), t.getMonth(), t.getDate());
}

async function load() {
  loading.value = true;
  try {
    days.value = await calendarDayApi.listDays({
      from: fromKey.value,
      to: toKey.value,
    });
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

function openDay(date: string) {
  void router.push(`/content/calendar-days/${date}`);
}

async function runBackfill() {
  backfillLoading.value = true;
  try {
    const result = await aiApi.runBackfill({
      from: fromKey.value,
      to: toKey.value,
      skipExisting: skipExisting.value,
      autoApply: autoApply.value,
      dryRun: dryRun.value,
      limit: backfillLimit.value,
    });
    message.success(
      `Backfill: processed ${result.processed}, generated ${result.generated}, applied ${result.applied}, skipped ${result.skipped}, failed ${result.failed}${result.dryRun ? " (dry-run)" : ""}`,
    );
    if (!result.dryRun) await load();
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    backfillLoading.value = false;
  }
}

onMounted(load);
watch([year, monthIndex], load);
</script>

<template>
  <div>
    <Space style="margin-bottom: 16px" wrap>
      <Title :level="3" style="margin: 0">Дни календаря</Title>
      <Select v-model:value="monthIndex" :options="monthOptions" style="width: 140px" />
      <Select v-model:value="year" :options="yearOptions" style="width: 100px" />
      <Button :loading="loading" @click="load">Обновить</Button>
      <Button type="primary" @click="openDay(todayKey())">Сегодня</Button>
    </Space>

    <Card title="Сетка месяца" :loading="loading" style="margin-bottom: 16px">
      <div class="weekday-row">
        <div v-for="w in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']" :key="w" class="weekday">
          {{ w }}
        </div>
      </div>
      <div class="month-grid">
        <button
          v-for="cell in cells"
          :key="cell.key"
          type="button"
          class="day-cell"
          :disabled="!cell.date"
          :style="{
            background: cell.date
              ? stateColor(dayMap.get(cell.date)?.generalState)
              : 'transparent',
          }"
          @click="cell.date && openDay(cell.date)"
        >
          <template v-if="cell.date">
            <div class="day-num">{{ cell.label }}</div>
            <div v-if="dayMap.get(cell.date)" class="day-meta">
              <Tag
                :color="
                  dayMap.get(cell.date)?.status === 'PUBLISHED' ? 'green' : 'default'
                "
                style="margin: 0"
              >
                {{ dayMap.get(cell.date)?.moonPhase || "—" }}
              </Tag>
            </div>
          </template>
        </button>
      </div>
    </Card>

    <Card title="Backfill (Phase 3)" size="small">
      <Form layout="inline">
        <Form.Item label="Dry-run">
          <Checkbox v-model:checked="dryRun" />
        </Form.Item>
        <Form.Item label="Skip existing">
          <Checkbox v-model:checked="skipExisting" />
        </Form.Item>
        <Form.Item label="Auto-apply DRAFT">
          <Checkbox v-model:checked="autoApply" />
        </Form.Item>
        <Form.Item label="Limit">
          <InputNumber v-model:value="backfillLimit" :min="1" :max="90" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" :loading="backfillLoading" @click="runBackfill">
            Запуск на месяц
          </Button>
        </Form.Item>
      </Form>
      <Text type="secondary">
        Для ~2 лет запускайте помесячно (limit ≤ 90) или несколькими прогонами.
      </Text>
    </Card>
  </div>
</template>

<style scoped>
.weekday-row,
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.weekday {
  text-align: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  padding: 4px;
}
.day-cell {
  min-height: 72px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px;
  text-align: left;
  cursor: pointer;
  background: #fafafa;
}
.day-cell:disabled {
  cursor: default;
  border-color: transparent;
  background: transparent;
}
.day-num {
  font-weight: 600;
}
.day-meta {
  margin-top: 4px;
}
</style>
