<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";

import { sitePageApi } from "@/api/content/sitePageApi";
import type { SitePage } from "@/types/siteContent";
import {
  DEFAULT_TELEGRAM_BLOCK,
  extractTelegramBlock,
  mergeTelegramIntoSectionsJson,
  parseSectionsJson,
  type TelegramBlockFormValues,
} from "@/utils/content/sitePageSections";

const { Title, Text } = Typography;

const DEFAULT_SECTIONS = JSON.stringify(
  [
    {
      type: "hero",
      title: "Выращивание с умом",
      subtitle: "Руководства по культурам и дневник сада.",
      ctaLabel: "Смотреть руководства",
      ctaHref: "/guides",
    },
    {
      type: "telegramBlock",
      ...DEFAULT_TELEGRAM_BLOCK,
    },
    {
      type: "cultureChips",
      title: "Культуры",
      subtitle: "Гайды и материалы по основным культурам.",
    },
    {
      type: "featuredGuides",
      cropKinds: ["TOMATO", "ZUCCHINI", "EGGPLANT", "CUCUMBER"],
    },
  ],
  null,
  2,
);

type FormModel = {
  title: string;
  sectionsJson: string;
  seoTitle: string;
  seoDescription: string;
  telegramTitle: string;
  telegramText: string;
  telegramChannelUrl: string;
  telegramButtonLabel: string;
};

const formModel = reactive<FormModel>({
  title: "SmartБотanik — главная",
  sectionsJson: DEFAULT_SECTIONS,
  seoTitle: "",
  seoDescription: "",
  telegramTitle: DEFAULT_TELEGRAM_BLOCK.title,
  telegramText: DEFAULT_TELEGRAM_BLOCK.text,
  telegramChannelUrl: DEFAULT_TELEGRAM_BLOCK.channelUrl,
  telegramButtonLabel: DEFAULT_TELEGRAM_BLOCK.buttonLabel,
});

const page = ref<SitePage | null>(null);
const loading = ref(true);
const submitting = ref(false);

function telegramFromForm(): TelegramBlockFormValues {
  return {
    title: formModel.telegramTitle,
    text: formModel.telegramText,
    channelUrl: formModel.telegramChannelUrl,
    buttonLabel: formModel.telegramButtonLabel,
  };
}

function applySectionsToForm(sectionsJson: string, title?: string) {
  try {
    const sections = parseSectionsJson(sectionsJson);
    const telegram = extractTelegramBlock(sections);
    formModel.sectionsJson = sectionsJson;
    if (title) {
      formModel.title = title;
    }
    formModel.telegramTitle = telegram.title;
    formModel.telegramText = telegram.text;
    formModel.telegramChannelUrl = telegram.channelUrl;
    formModel.telegramButtonLabel = telegram.buttonLabel;
  } catch {
    formModel.sectionsJson = sectionsJson;
    formModel.telegramTitle = DEFAULT_TELEGRAM_BLOCK.title;
    formModel.telegramText = DEFAULT_TELEGRAM_BLOCK.text;
    formModel.telegramChannelUrl = DEFAULT_TELEGRAM_BLOCK.channelUrl;
    formModel.telegramButtonLabel = DEFAULT_TELEGRAM_BLOCK.buttonLabel;
  }
}

async function loadPage() {
  loading.value = true;
  try {
    const item = await sitePageApi.getSitePage("home");
    if (item) {
      page.value = item;
      applySectionsToForm(JSON.stringify(item.sections, null, 2), item.title);
      formModel.seoTitle = item.seoTitle ?? "";
      formModel.seoDescription = item.seoDescription ?? "";
    }
  } catch {
    applySectionsToForm(DEFAULT_SECTIONS);
  } finally {
    loading.value = false;
  }
}

function syncTelegramToSectionsJson(): string | null {
  try {
    const merged = mergeTelegramIntoSectionsJson(
      formModel.sectionsJson,
      telegramFromForm(),
    );
    formModel.sectionsJson = merged;
    return merged;
  } catch {
    message.error("Не удалось обновить sectionsJson из полей Telegram");
    return null;
  }
}

async function onSubmit() {
  let sectionsJson = formModel.sectionsJson;
  try {
    sectionsJson = mergeTelegramIntoSectionsJson(
      formModel.sectionsJson,
      telegramFromForm(),
    );
    parseSectionsJson(sectionsJson);
    formModel.sectionsJson = sectionsJson;
  } catch {
    message.error("sectionsJson: невалидный JSON");
    return;
  }

  submitting.value = true;
  try {
    const saved = await sitePageApi.upsertSitePage({
      key: "home",
      title: formModel.title.trim(),
      sectionsJson,
      seoTitle: formModel.seoTitle.trim() || null,
      seoDescription: formModel.seoDescription.trim() || null,
    });
    page.value = saved;
    applySectionsToForm(JSON.stringify(saved.sections, null, 2), saved.title);
    message.success("Главная сохранена");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  } finally {
    submitting.value = false;
  }
}

async function handlePublishToggle() {
  try {
    if (page.value?.status === "PUBLISHED") {
      const saved = await sitePageApi.unpublishSitePage("home");
      page.value = saved;
      message.success("Снято с публикации");
      return;
    }

    const merged = syncTelegramToSectionsJson();
    if (merged) {
      await sitePageApi.upsertSitePage({
        key: "home",
        title: formModel.title.trim(),
        sectionsJson: merged,
        seoTitle: formModel.seoTitle.trim() || null,
        seoDescription: formModel.seoDescription.trim() || null,
      });
    }
    const saved = await sitePageApi.publishSitePage("home");
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
      <Title :level="3" style="margin: 0">Главная страница</Title>
      <Space>
        <Tag v-if="page" :color="page.status === 'PUBLISHED' ? 'green' : 'default'">
          {{ page.status }}
        </Tag>
        <Button @click="handlePublishToggle">
          {{ page?.status === "PUBLISHED" ? "Снять с публикации" : "Опубликовать" }}
        </Button>
      </Space>
    </Space>
    <Text type="secondary">Ключ страницы: home · секция telegramBlock → блок на `/`</Text>
    <Card :loading="loading">
      <Form layout="vertical" @finish="onSubmit">
        <Form.Item label="Заголовок" required>
          <Input v-model:value="formModel.title" :maxlength="200" />
        </Form.Item>

        <Card size="small" title="Telegram-блок (главная)" style="margin-bottom: 16px">
          <Form.Item label="Заголовок" required>
            <Input
              v-model:value="formModel.telegramTitle"
              :maxlength="200"
              @blur="syncTelegramToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Текст">
            <Input.TextArea
              v-model:value="formModel.telegramText"
              :rows="3"
              @blur="syncTelegramToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Ссылка на канал" required>
            <Input
              v-model:value="formModel.telegramChannelUrl"
              placeholder="https://t.me/..."
              @blur="syncTelegramToSectionsJson"
            />
          </Form.Item>
          <Form.Item label="Текст кнопки" required>
            <Input
              v-model:value="formModel.telegramButtonLabel"
              :maxlength="80"
              @blur="syncTelegramToSectionsJson"
            />
          </Form.Item>
          <Button @click="syncTelegramToSectionsJson">Применить к sections JSON</Button>
        </Card>

        <Collapse>
          <Collapse.Panel key="sections-json" header="Sections (JSON) — все секции главной">
            <Input.TextArea v-model:value="formModel.sectionsJson" :rows="16" />
          </Collapse.Panel>
        </Collapse>

        <Form.Item label="SEO title" style="margin-top: 16px">
          <Input v-model:value="formModel.seoTitle" :maxlength="200" />
        </Form.Item>
        <Form.Item label="SEO description">
          <Input.TextArea v-model:value="formModel.seoDescription" :rows="2" :maxlength="500" />
        </Form.Item>
        <Button type="primary" html-type="submit" :loading="submitting">Сохранить</Button>
      </Form>
    </Card>
  </Space>
</template>
