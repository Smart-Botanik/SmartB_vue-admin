<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { LinkOutlined, RobotOutlined, SendOutlined } from "@ant-design/icons-vue";
import {
  Alert,
  Button,
  Empty,
  List,
  Modal,
  Radio,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "ant-design-vue";

import { cropGuideApi } from "@/api/content/cropGuideApi";
import { telegramApi } from "@/api/telegram/telegramApi";
import type { ContentStatus } from "@/types/content";
import type { TelegramBot, TelegramChannel } from "@/types/telegram";

const props = defineProps<{
  open: boolean;
  guideId: string;
  guideTitle?: string;
  guideStatus?: ContentStatus;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  published: [];
}>();

const { Text, Paragraph } = Typography;
const router = useRouter();

const loading = ref(false);
const publishing = ref(false);
const bots = ref<TelegramBot[]>([]);
const defaultChannelId = ref<string | undefined>();
const selectedChannelId = ref<string | undefined>();

type BotChannelGroup = {
  bot: TelegramBot;
  channels: TelegramChannel[];
};

type PublicationPreviewRow = {
  key: string;
  botName: string;
  channelName: string;
  meta: string;
  statusLabel: string;
  statusColor: string;
};

const botChannelGroups = computed<BotChannelGroup[]>(() =>
  bots.value
    .map((bot) => ({
      bot,
      channels: (bot.channels ?? []).filter((channel) => channel.isActive),
    }))
    .filter((group) => group.channels.length > 0),
);

const publishableChannels = computed(() =>
  botChannelGroups.value.flatMap((group) => group.channels),
);

const selectedChannel = computed(() =>
  publishableChannels.value.find((channel) => channel.id === selectedChannelId.value),
);

const selectedBot = computed(() => {
  if (!selectedChannel.value) {
    return null;
  }
  return (
    botChannelGroups.value.find((group) =>
      group.channels.some((channel) => channel.id === selectedChannel.value?.id),
    )?.bot ??
    selectedChannel.value.bot ??
    null
  );
});

const guideStatusLabel = computed(() => {
  switch (props.guideStatus) {
    case "PUBLISHED":
      return "Опубликовано";
    case "ARCHIVED":
      return "Архив";
    default:
      return "Черновик";
  }
});

const guideStatusColor = computed(() => {
  switch (props.guideStatus) {
    case "PUBLISHED":
      return "green";
    case "ARCHIVED":
      return "default";
    default:
      return "gold";
  }
});

const publicationPreviewRows = computed<PublicationPreviewRow[]>(() => {
  if (!selectedChannel.value || !selectedBot.value) {
    return [];
  }

  return [
    {
      key: selectedChannel.value.id,
      botName: selectedBot.value.name,
      channelName: selectedChannel.value.name,
      meta: channelMeta(selectedChannel.value),
      statusLabel: guideStatusLabel.value,
      statusColor: guideStatusColor.value,
    },
  ];
});

async function loadTelegramTargets() {
  loading.value = true;
  try {
    const [loadedBots, defaultChannel] = await Promise.all([
      telegramApi.listBots(),
      telegramApi.getDefaultChannel(),
    ]);

    bots.value = loadedBots.filter((bot) => bot.isActive);
    defaultChannelId.value = defaultChannel?.isActive ? defaultChannel.id : undefined;

    const firstChannel =
      defaultChannelId.value ??
      botChannelGroups.value.find((group) => group.channels.some((c) => c.isDefault))
        ?.channels.find((c) => c.isDefault)?.id ??
      publishableChannels.value[0]?.id;

    selectedChannelId.value = firstChannel;
  } catch (error) {
    bots.value = [];
    selectedChannelId.value = undefined;
    message.error(error instanceof Error ? error.message : "Не удалось загрузить Telegram-каналы");
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadTelegramTargets();
    }
  },
);

function closeModal() {
  emit("update:open", false);
}

function openTelegramHub() {
  closeModal();
  void router.push("/community/telegram");
}

async function handlePublish() {
  if (!selectedChannelId.value) {
    message.error("Выберите канал для публикации");
    return;
  }

  publishing.value = true;
  try {
    const result = await cropGuideApi.publishGuideToTelegram(
      props.guideId,
      selectedChannelId.value,
    );
    if (!result.success) {
      message.error(result.message ?? "Не удалось отправить в Telegram");
      return;
    }
    message.success(result.message ?? "Опубликовано в Telegram");
    emit("published");
    closeModal();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка отправки в Telegram");
  } finally {
    publishing.value = false;
  }
}

function botLabel(bot: TelegramBot): string {
  return bot.username ? `${bot.name} (@${bot.username})` : bot.name;
}

function channelMeta(channel: TelegramChannel): string {
  const parts = [channel.chatId];
  if (channel.publicUrl) {
    parts.push(channel.publicUrl);
  }
  return parts.join(" · ");
}
</script>

<template>
  <Modal
    :open="open"
    title="Отправить в Telegram"
    :width="720"
    :confirm-loading="publishing"
    ok-text="Опубликовать"
    cancel-text="Отмена"
    :ok-button-props="{ disabled: !selectedChannelId || publishableChannels.length === 0 }"
    @ok="handlePublish"
    @cancel="closeModal"
  >
    <Space direction="vertical" size="middle" style="width: 100%">
      <Paragraph v-if="guideTitle" style="margin: 0">
        Руководство: <Text strong>{{ guideTitle }}</Text>
      </Paragraph>

      <Alert
        type="info"
        show-icon
        message="Выберите канал"
        description="Пост будет отправлен через бота, привязанного к выбранному каналу."
      />

      <Spin :spinning="loading">
        <Empty
          v-if="!loading && publishableChannels.length === 0"
          description="Нет активных каналов для публикации"
        >
          <Button type="primary" @click="openTelegramHub">
            <template #icon><LinkOutlined /></template>
            Настроить ботов и каналы
          </Button>
        </Empty>

        <Radio.Group
          v-else
          v-model:value="selectedChannelId"
          style="width: 100%"
        >
          <Space direction="vertical" size="large" style="width: 100%">
            <div
              v-for="group in botChannelGroups"
              :key="group.bot.id"
              class="telegram-publish-group"
            >
              <Space align="center" style="margin-bottom: 8px">
                <RobotOutlined />
                <Text strong>{{ botLabel(group.bot) }}</Text>
                <Tag :color="group.bot.isActive ? 'green' : 'default'">
                  {{ group.bot.isActive ? "бот активен" : "бот неактивен" }}
                </Tag>
              </Space>

              <Space direction="vertical" size="small" style="width: 100%; padding-left: 24px">
                <Radio
                  v-for="channel in group.channels"
                  :key="channel.id"
                  :value="channel.id"
                  class="telegram-publish-channel"
                >
                  <Space direction="vertical" :size="0">
                    <Space wrap>
                      <SendOutlined />
                      <Text>{{ channel.name }}</Text>
                      <Tag v-if="channel.isDefault" color="blue">по умолчанию</Tag>
                    </Space>
                    <Text type="secondary" style="font-size: 12px">
                      {{ channelMeta(channel) }}
                    </Text>
                  </Space>
                </Radio>
              </Space>
            </div>
          </Space>
        </Radio.Group>
      </Spin>

      <div v-if="publicationPreviewRows.length > 0" class="telegram-publication-preview">
        <Text strong style="display: block; margin-bottom: 8px">Публикация</Text>
        <List size="small" :data-source="publicationPreviewRows">
          <template #renderItem="{ item }">
            <List.Item class="telegram-publication-preview-item">
              <Space direction="vertical" :size="0" style="width: 100%">
                <Space wrap>
                  <Text>{{ item.botName }} → {{ item.channelName }}</Text>
                  <Tag :color="item.statusColor">{{ item.statusLabel }}</Tag>
                </Space>
                <Text type="secondary" style="font-size: 12px">
                  {{ item.meta }}
                </Text>
              </Space>
            </List.Item>
          </template>
        </List>
      </div>

      <Button v-if="publishableChannels.length > 0" type="link" @click="openTelegramHub">
        <template #icon><LinkOutlined /></template>
        Управление ботами и каналами
      </Button>
    </Space>
  </Modal>
</template>

<style scoped>
.telegram-publish-group {
  width: 100%;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.telegram-publish-group:last-child {
  border-bottom: none;
}

.telegram-publish-channel {
  display: flex;
  align-items: flex-start;
  width: 100%;
  margin-inline-start: 0;
  padding: 8px 12px;
  border-radius: 8px;
}

.telegram-publish-channel:hover {
  background: #fafafa;
}

.telegram-publication-preview {
  padding-top: 4px;
  border-top: 1px solid #f0f0f0;
}

.telegram-publication-preview-item {
  padding-inline: 0 !important;
}
</style>
