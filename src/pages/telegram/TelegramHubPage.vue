<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from "vue";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import type { ColumnsType } from "ant-design-vue/es/table";

import { telegramApi } from "@/api/telegram/telegramApi";
import type { TelegramBot, TelegramChannel } from "@/types/telegram";

const { Title, Text } = Typography;

const activeTab = ref("bots");
const loading = ref(false);
const bots = ref<TelegramBot[]>([]);
const channels = ref<TelegramChannel[]>([]);
const defaultChannel = ref<TelegramChannel | null>(null);

const botModalOpen = ref(false);
const botModalMode = ref<"create" | "edit">("create");
const editingBotId = ref<string | null>(null);
const botForm = reactive({
  name: "",
  token: "",
  isActive: true,
});
const botSubmitting = ref(false);
const botValidating = ref(false);
const botTokenValidation = ref<{
  username?: string | null;
  firstName: string;
} | null>(null);

const channelModalOpen = ref(false);
const channelModalMode = ref<"create" | "edit">("create");
const editingChannelId = ref<string | null>(null);
const channelForm = reactive({
  name: "",
  chatId: "",
  botId: "",
  isDefault: false,
  isActive: true,
  publicUrl: "",
});
const channelSubmitting = ref(false);

const botOptions = computed(() =>
  bots.value.map((bot) => ({
    value: bot.id,
    label: bot.username ? `${bot.name} (@${bot.username})` : bot.name,
  })),
);

const botColumns: ColumnsType<TelegramBot> = [
  { title: "Название", dataIndex: "name", key: "name" },
  {
    title: "Username",
    key: "username",
    customRender: ({ record }) => record.username ? `@${record.username}` : "—",
  },
  { title: "Токен", dataIndex: "tokenMasked", key: "tokenMasked" },
  {
    title: "Активен",
    key: "isActive",
    customRender: ({ record }) =>
      h(Tag, { color: record.isActive ? "green" : "default" }, () =>
        record.isActive ? "Да" : "Нет",
      ),
  },
  {
    title: "Каналов",
    key: "channels",
    customRender: ({ record }) => record.channels?.length ?? 0,
  },
  {
    title: "",
    key: "actions",
    width: 160,
    customRender: ({ record }) =>
      h(Space, {}, () => [
        h(Button, { size: "small", onClick: () => openEditBot(record) }, () => "Изменить"),
        h(
          Popconfirm,
          {
            title: "Удалить бота?",
            onConfirm: () => deleteBot(record.id),
          },
          () => h(Button, { size: "small", danger: true }, () => "Удалить"),
        ),
      ]),
  },
];

const channelColumns: ColumnsType<TelegramChannel> = [
  { title: "Название", dataIndex: "name", key: "name" },
  { title: "Chat ID", dataIndex: "chatId", key: "chatId" },
  {
    title: "Бот",
    key: "bot",
    customRender: ({ record }) => record.bot?.name ?? record.botId,
  },
  {
    title: "По умолчанию",
    key: "isDefault",
    customRender: ({ record }) =>
      record.isDefault ? h(Tag, { color: "blue" }, () => "default") : "—",
  },
  {
    title: "Активен",
    key: "isActive",
    customRender: ({ record }) =>
      h(Tag, { color: record.isActive ? "green" : "default" }, () =>
        record.isActive ? "Да" : "Нет",
      ),
  },
  {
    title: "Публичная ссылка",
    key: "publicUrl",
    customRender: ({ record }) => record.publicUrl ?? "—",
  },
  {
    title: "",
    key: "actions",
    width: 160,
    customRender: ({ record }) =>
      h(Space, {}, () => [
        h(Button, { size: "small", onClick: () => openEditChannel(record) }, () => "Изменить"),
        h(
          Popconfirm,
          {
            title: "Удалить канал?",
            onConfirm: () => deleteChannel(record.id),
          },
          () => h(Button, { size: "small", danger: true }, () => "Удалить"),
        ),
      ]),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const [botsList, channelsList, defaultCh] = await Promise.all([
      telegramApi.listBots(),
      telegramApi.listChannels(),
      telegramApi.getDefaultChannel(),
    ]);
    bots.value = botsList;
    channels.value = channelsList;
    defaultChannel.value = defaultCh;
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Не удалось загрузить Telegram");
  } finally {
    loading.value = false;
  }
}

function resetBotForm() {
  botForm.name = "";
  botForm.token = "";
  botForm.isActive = true;
  editingBotId.value = null;
  botTokenValidation.value = null;
}

function openCreateBot() {
  resetBotForm();
  botModalMode.value = "create";
  botModalOpen.value = true;
}

function openEditBot(bot: TelegramBot) {
  botModalMode.value = "edit";
  editingBotId.value = bot.id;
  botForm.name = bot.name;
  botForm.token = "";
  botForm.isActive = bot.isActive;
  botModalOpen.value = true;
}

async function validateBotToken() {
  if (!botForm.token.trim()) {
    message.error("Введите токен для проверки");
    return;
  }

  botValidating.value = true;
  botTokenValidation.value = null;
  try {
    const result = await telegramApi.validateBotToken(botForm.token.trim());
    botTokenValidation.value = {
      username: result.username,
      firstName: result.firstName,
    };
    if (!botForm.name.trim()) {
      botForm.name = result.username ? `@${result.username}` : result.firstName;
    }
    message.success("Токен валиден");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Токен не прошёл проверку");
  } finally {
    botValidating.value = false;
  }
}

async function submitBot() {
  if (!botForm.name.trim()) {
    message.error("Укажите название бота");
    return;
  }
  if (botModalMode.value === "create" && !botForm.token.trim()) {
    message.error("Укажите токен бота");
    return;
  }

  botSubmitting.value = true;
  try {
    if (botModalMode.value === "create") {
      await telegramApi.createBot({
        name: botForm.name.trim(),
        token: botForm.token.trim(),
        isActive: botForm.isActive,
      });
      message.success("Бот добавлен");
    } else if (editingBotId.value) {
      await telegramApi.updateBot(editingBotId.value, {
        name: botForm.name.trim(),
        token: botForm.token.trim() || null,
        isActive: botForm.isActive,
      });
      message.success("Бот обновлён");
    }
    botModalOpen.value = false;
    await loadData();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения бота");
  } finally {
    botSubmitting.value = false;
  }
}

async function deleteBot(id: string) {
  try {
    await telegramApi.deleteBot(id);
    message.success("Бот удалён");
    await loadData();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  }
}

function resetChannelForm() {
  channelForm.name = "";
  channelForm.chatId = "";
  channelForm.botId = bots.value[0]?.id ?? "";
  channelForm.isDefault = false;
  channelForm.isActive = true;
  channelForm.publicUrl = "";
  editingChannelId.value = null;
}

function openCreateChannel() {
  resetChannelForm();
  channelModalMode.value = "create";
  channelModalOpen.value = true;
}

function openEditChannel(channel: TelegramChannel) {
  channelModalMode.value = "edit";
  editingChannelId.value = channel.id;
  channelForm.name = channel.name;
  channelForm.chatId = channel.chatId;
  channelForm.botId = channel.botId;
  channelForm.isDefault = channel.isDefault;
  channelForm.isActive = channel.isActive;
  channelForm.publicUrl = channel.publicUrl ?? "";
  channelModalOpen.value = true;
}

async function submitChannel() {
  if (!channelForm.name.trim() || !channelForm.chatId.trim() || !channelForm.botId) {
    message.error("Заполните название, chat ID и выберите бота");
    return;
  }

  channelSubmitting.value = true;
  try {
    const payload = {
      name: channelForm.name.trim(),
      chatId: channelForm.chatId.trim(),
      botId: channelForm.botId,
      isDefault: channelForm.isDefault,
      isActive: channelForm.isActive,
      publicUrl: channelForm.publicUrl.trim() || null,
    };

    if (channelModalMode.value === "create") {
      await telegramApi.createChannel(payload);
      message.success("Канал добавлен");
    } else if (editingChannelId.value) {
      await telegramApi.updateChannel(editingChannelId.value, payload);
      message.success("Канал обновлён");
    }
    channelModalOpen.value = false;
    await loadData();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения канала");
  } finally {
    channelSubmitting.value = false;
  }
}

async function deleteChannel(id: string) {
  try {
    await telegramApi.deleteChannel(id);
    message.success("Канал удалён");
    await loadData();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка удаления");
  }
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <div>
      <Title :level="3" style="margin: 0">Telegram</Title>
      <Text type="secondary">
        Боты, каналы и (далее) очередь публикаций. Канал по умолчанию:
        <Tag v-if="defaultChannel" color="blue">{{ defaultChannel.name }}</Tag>
        <span v-else>не задан</span>
      </Text>
    </div>

    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="bots" tab="Боты">
        <Card :loading="loading">
          <Space style="margin-bottom: 16px">
            <Button type="primary" @click="openCreateBot">Добавить бота</Button>
          </Space>
          <Table
            row-key="id"
            :columns="botColumns"
            :data-source="bots"
            :pagination="false"
          />
        </Card>
      </Tabs.TabPane>

      <Tabs.TabPane key="channels" tab="Каналы">
        <Card :loading="loading">
          <Space style="margin-bottom: 16px">
            <Button type="primary" :disabled="!bots.length" @click="openCreateChannel">
              Добавить канал
            </Button>
          </Space>
          <Table
            row-key="id"
            :columns="channelColumns"
            :data-source="channels"
            :pagination="false"
          />
        </Card>
      </Tabs.TabPane>

      <Tabs.TabPane key="queue" tab="Очередь">
        <Alert
          type="info"
          show-icon
          message="Планировщик публикаций"
          description="Очередь постов появится после BK-TG-QUEUE-1 (Phase 2 TG-INT-1). Публикация гайдов — кнопка «Отправить в Telegram» в Vue admin."
        />
      </Tabs.TabPane>
    </Tabs>

    <Modal
      v-model:open="botModalOpen"
      :title="botModalMode === 'create' ? 'Добавить бота' : 'Изменить бота'"
      :confirm-loading="botSubmitting"
      @ok="submitBot"
    >
      <Form layout="vertical">
        <Form.Item label="Название" required>
          <Input v-model:value="botForm.name" />
        </Form.Item>
        <Form.Item
          :label="botModalMode === 'create' ? 'Токен' : 'Новый токен (оставьте пустым, чтобы не менять)'"
          :required="botModalMode === 'create'"
        >
          <Space.Compact style="width: 100%">
            <Input.Password
              v-model:value="botForm.token"
              autocomplete="off"
              style="flex: 1"
            />
            <Button
              :loading="botValidating"
              :disabled="!botForm.token.trim()"
              @click="validateBotToken"
            >
              Проверить
            </Button>
          </Space.Compact>
        </Form.Item>
        <Alert
          v-if="botTokenValidation"
          type="success"
          show-icon
          :message="`Токен валиден: ${botTokenValidation.firstName}${
            botTokenValidation.username ? ` (@${botTokenValidation.username})` : ''
          }`"
          style="margin-bottom: 16px"
        />
        <Form.Item label="Активен">
          <Switch v-model:checked="botForm.isActive" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="channelModalOpen"
      :title="channelModalMode === 'create' ? 'Добавить канал' : 'Изменить канал'"
      :confirm-loading="channelSubmitting"
      @ok="submitChannel"
    >
      <Form layout="vertical">
        <Form.Item label="Название" required>
          <Input v-model:value="channelForm.name" />
        </Form.Item>
        <Form.Item label="Chat ID" required>
          <Input v-model:value="channelForm.chatId" placeholder="-100…" />
        </Form.Item>
        <Form.Item label="Бот" required>
          <Select v-model:value="channelForm.botId" :options="botOptions" />
        </Form.Item>
        <Form.Item label="Публичная ссылка (t.me/…)">
          <Input v-model:value="channelForm.publicUrl" placeholder="https://t.me/..." />
        </Form.Item>
        <Form.Item label="Канал по умолчанию">
          <Switch v-model:checked="channelForm.isDefault" />
        </Form.Item>
        <Form.Item label="Активен">
          <Switch v-model:checked="channelForm.isActive" />
        </Form.Item>
      </Form>
    </Modal>
  </Space>
</template>
