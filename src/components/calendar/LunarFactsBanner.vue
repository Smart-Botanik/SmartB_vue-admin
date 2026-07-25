<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { Alert, Button, Space, Spin, Typography, message } from "ant-design-vue";
import { aiApi, type LunarFacts } from "@/api/content/aiApi";

const props = defineProps<{
  date: string;
}>();

const emit = defineEmits<{
  fill: [facts: LunarFacts];
}>();

const { Text } = Typography;
const loading = ref(false);
const facts = ref<LunarFacts | null>(null);
const error = ref<string | null>(null);

async function load() {
  if (!props.date) return;
  loading.value = true;
  error.value = null;
  try {
    facts.value = await aiApi.lunarFacts(props.date, "UTC");
  } catch (e) {
    facts.value = null;
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function fillForm() {
  if (!facts.value) {
    message.warning("Нет данных эфемерид");
    return;
  }
  emit("fill", facts.value);
  message.success("Фаза и знак заполнены из эфемерид");
}

onMounted(load);
watch(() => props.date, load);
</script>

<template>
  <Alert type="info" show-icon>
    <template #message>
      <Spin :spinning="loading">
        <div v-if="error">
          <Text type="danger">{{ error }}</Text>
          <div style="margin-top: 8px">
            <Button size="small" @click="load">Повторить</Button>
          </div>
        </div>
        <Space v-else-if="facts" wrap>
          <Text>
            Эфемериды:
            <Text strong>{{ facts.moonPhase }}</Text>
            /
            <Text strong>{{ facts.moonZodiacSign }}</Text>
            (illum {{ (facts.illumination * 100).toFixed(0) }}%)
          </Text>
          <Button type="primary" size="small" @click="fillForm">
            Заполнить из эфемерид
          </Button>
        </Space>
        <Text v-else type="secondary">Загрузка эфемерид…</Text>
      </Spin>
    </template>
  </Alert>
</template>
