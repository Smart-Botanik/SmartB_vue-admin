<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";

import { sitePageApi } from "@/api/content/sitePageApi";
import type { SitePage } from "@/types/siteContent";
import { parseSectionsJson } from "@/utils/content/sitePageSections";
import {
  DEFAULT_CALENDAR_INTRO,
  DEFAULT_MOON_MODE,
  DEFAULT_SEASONS_MODE,
  buildDefaultCalendarSectionsJson,
  extractCalendarFormFromSections,
  mergeCalendarFormIntoSectionsJson,
  type CalendarModeId,
} from "@/utils/content/calendarPageSections";

const { Title, Text } = Typography;

const PAGE_KEY = "calendar";

type FormModel = {
  title: string;
  sectionsJson: string;
  seoTitle: string;
  seoDescription: string;
  introTitle: string;
  introSubtitle: string;
  defaultMode: CalendarModeId;
  moonLabel: string;
  moonDescriptionMd: string;
  moonDataJson: string;
  seasonsLabel: string;
  seasonsDescriptionMd: string;
  seasonsDataJson: string;
};

const formModel = reactive<FormModel>({
  title: "Календарь — SmartБотаник",
  sectionsJson: buildDefaultCalendarSectionsJson(),
  seoTitle: "",
  seoDescription: "",
  introTitle: DEFAULT_CALENDAR_INTRO.title,
  introSubtitle: DEFAULT_CALENDAR_INTRO.subtitle,
  defaultMode: DEFAULT_CALENDAR_INTRO.defaultMode,
  moonLabel: DEFAULT_MOON_MODE.label,
  moonDescriptionMd: DEFAULT_MOON_MODE.descriptionMd,
  moonDataJson: DEFAULT_MOON_MODE.dataJson,
  seasonsLabel: DEFAULT_SEASONS_MODE.label,
  seasonsDescriptionMd: DEFAULT_SEASONS_MODE.descriptionMd,
  seasonsDataJson: DEFAULT_SEASONS_MODE.dataJson,
});

const page = ref<SitePage | null>(null);
const loading = ref(true);
const submitting = ref(false);

const modeOptions = [
  { value: "moon", label: "Лунный" },
  { value: "seasons", label: "Сезонный" },
];

function applySectionsToForm(sectionsJson: string, title?: string) {
  try {
    const sections = parseSectionsJson(sectionsJson);
    const extracted = extractCalendarFormFromSections(sections);
    formModel.sectionsJson = sectionsJson;
    if (title) {
      formModel.title = title;
    }
    formModel.introTitle = extracted.intro.title;
    formModel.introSubtitle = extracted.intro.subtitle;
    formModel.defaultMode = extracted.intro.defaultMode;
    formModel.moonLabel = extracted.moon.label;
    formModel.moonDescriptionMd = extracted.moon.descriptionMd;
    formModel.moonDataJson = extracted.moon.dataJson;
    formModel.seasonsLabel = extracted.seasons.label;
    formModel.seasonsDescriptionMd = extracted.seasons.descriptionMd;
    formModel.seasonsDataJson = extracted.seasons.dataJson;
  } catch {
    formModel.sectionsJson = sectionsJson;
  }
}

function syncFormToSectionsJson(): string | null {
  try {
    const merged = mergeCalendarFormIntoSectionsJson(
      {
        title: formModel.introTitle,
        subtitle: formModel.introSubtitle,
        defaultMode: formModel.defaultMode,
      },
      {
        label: formModel.moonLabel,
        descriptionMd: formModel.moonDescriptionMd,
        dataJson: formModel.moonDataJson,
      },
      {
        label: formModel.seasonsLabel,
        descriptionMd: formModel.seasonsDescriptionMd,
        dataJson: formModel.seasonsDataJson,
      },
      formModel.sectionsJson,
    );
    formModel.sectionsJson = merged;
    return merged;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сборки sections");
    return null;
  }
}

async function loadPage() {
  loading.value = true;
  try {
    const item = await sitePageApi.getSitePage(PAGE_KEY);
    if (item) {
      page.value = item;
      applySectionsToForm(JSON.stringify(item.sections, null, 2), item.title);
      formModel.seoTitle = item.seoTitle ?? "";
      formModel.seoDescription = item.seoDescription ?? "";
    } else {
      applySectionsToForm(buildDefaultCalendarSectionsJson());
    }
  } catch {
    applySectionsToForm(buildDefaultCalendarSectionsJson());
  } finally {
    loading.value = false;
  }
}

async function onSubmit() {
  const sectionsJson = syncFormToSectionsJson();
  if (!sectionsJson) {
    return;
  }

  submitting.value = true;
  try {
    const saved = await sitePageApi.upsertSitePage({
      key: PAGE_KEY,
      title: formModel.title.trim(),
      sectionsJson,
      seoTitle: formModel.seoTitle.trim() || null,
      seoDescription: formModel.seoDescription.trim() || null,
    });
    page.value = saved;
    applySectionsToForm(JSON.stringify(saved.sections, null, 2), saved.title);
    message.success("Календарь сохранён");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  } finally {
    submitting.value = false;
  }
}

async function handlePublishToggle() {
  try {
    if (page.value?.status === "PUBLISHED") {
      const saved = await sitePageApi.unpublishSitePage(PAGE_KEY);
      page.value = saved;
      message.success("Снято с публикации");
      return;
    }

    const merged = syncFormToSectionsJson();
    if (merged) {
      await sitePageApi.upsertSitePage({
        key: PAGE_KEY,
        title: formModel.title.trim(),
        sectionsJson: merged,
        seoTitle: formModel.seoTitle.trim() || null,
        seoDescription: formModel.seoDescription.trim() || null,
      });
    }
    const saved = await sitePageApi.publishSitePage(PAGE_KEY);
    page.value = saved;
    message.success("Опубликовано");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка публикации");
  }
}

onMounted(() => {
  void loadPage();
});
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <Title :level="3" style="margin: 0">Календарь</Title>
      <Space>
        <Tag v-if="page" :color="page.status === 'PUBLISHED' ? 'green' : 'default'">
          {{ page.status }}
        </Tag>
        <Button @click="handlePublishToggle">
          {{ page?.status === "PUBLISHED" ? "Снять с публикации" : "Опубликовать" }}
        </Button>
      </Space>
    </Space>
    <Text type="secondary">
      Ключ страницы: calendar · публичная страница `/calendar` (лунный | сезонный)
    </Text>
    <Card :loading="loading">
      <Form layout="vertical" @finish="onSubmit">
        <Form.Item label="Заголовок (админ)" required>
          <Input v-model:value="formModel.title" :maxlength="200" />
        </Form.Item>

        <Card size="small" title="Intro" style="margin-bottom: 16px">
          <Form.Item label="Заголовок на сайте" required>
            <Input v-model:value="formModel.introTitle" :maxlength="200" @blur="syncFormToSectionsJson" />
          </Form.Item>
          <Form.Item label="Подзаголовок">
            <Input.TextArea
              v-model:value="formModel.introSubtitle"
              :rows="2"
              @blur="syncFormToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Режим по умолчанию">
            <Select
              v-model:value="formModel.defaultMode"
              :options="modeOptions"
              style="width: 220px"
              @change="syncFormToSectionsJson"
            />
          </Form.Item>
        </Card>

        <Card size="small" title="Лунный календарь" style="margin-bottom: 16px">
          <Form.Item label="Подпись режима" required>
            <Input v-model:value="formModel.moonLabel" :maxlength="120" @blur="syncFormToSectionsJson" />
          </Form.Item>
          <Form.Item label="Описание (Markdown)">
            <Input.TextArea
              v-model:value="formModel.moonDescriptionMd"
              :rows="4"
              @blur="syncFormToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Данные (JSON) — entries[]: date, phase?, note?">
            <Input.TextArea
              v-model:value="formModel.moonDataJson"
              :rows="10"
              @blur="syncFormToSectionsJson"
            />
          </Form.Item>
        </Card>

        <Card size="small" title="Сезонный календарь" style="margin-bottom: 16px">
          <Form.Item label="Подпись режима" required>
            <Input
              v-model:value="formModel.seasonsLabel"
              :maxlength="120"
              @blur="syncFormToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Описание (Markdown)">
            <Input.TextArea
              v-model:value="formModel.seasonsDescriptionMd"
              :rows="4"
              @blur="syncFormToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Данные (JSON) — seasons[]: id, label, start?, end?, note?">
            <Input.TextArea
              v-model:value="formModel.seasonsDataJson"
              :rows="12"
              @blur="syncFormToSectionsJson"
            />
          </Form.Item>
        </Card>

        <Collapse>
          <Collapse.Panel key="sections-json" header="Sections (JSON) — полный документ">
            <Input.TextArea v-model:value="formModel.sectionsJson" :rows="14" />
          </Collapse.Panel>
        </Collapse>

        <Form.Item label="SEO title" style="margin-top: 16px">
          <Input v-model:value="formModel.seoTitle" :maxlength="200" />
        </Form.Item>
        <Form.Item label="SEO description">
          <Input.TextArea v-model:value="formModel.seoDescription" :rows="2" :maxlength="500" />
        </Form.Item>
        <Space>
          <Button @click="syncFormToSectionsJson">Собрать sections JSON</Button>
          <Button type="primary" html-type="submit" :loading="submitting">Сохранить</Button>
        </Space>
      </Form>
    </Card>
  </Space>
</template>
