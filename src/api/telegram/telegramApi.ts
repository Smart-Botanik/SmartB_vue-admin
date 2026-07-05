import { graphqlClient } from "@/services/graphql/client";
import type {
  CreateTelegramBotInput,
  CreateTelegramChannelInput,
  TelegramBot,
  TelegramChannel,
  UpdateTelegramBotInput,
  UpdateTelegramChannelInput,
} from "@/types/telegram";

const TELEGRAM_BOT_FIELDS = `
  id
  name
  username
  tokenMasked
  isActive
  createdAt
  updatedAt
`;

const TELEGRAM_CHANNEL_FIELDS = `
  id
  name
  chatId
  botId
  isDefault
  isActive
  publicUrl
  createdAt
  updatedAt
`;

export const telegramApi = {
  async listBots(): Promise<TelegramBot[]> {
    const data = await graphqlClient.request<{ telegramBots: TelegramBot[] }>({
      query: `query TelegramBots {
        telegramBots {
          ${TELEGRAM_BOT_FIELDS}
          channels { ${TELEGRAM_CHANNEL_FIELDS} }
        }
      }`,
      operationName: "TelegramBots",
    });
    return data.telegramBots;
  },

  async listChannels(botId?: string): Promise<TelegramChannel[]> {
    const data = await graphqlClient.request<
      { telegramChannels: TelegramChannel[] },
      { botId?: string }
    >({
      query: `query TelegramChannels($botId: ID) {
        telegramChannels(botId: $botId) {
          ${TELEGRAM_CHANNEL_FIELDS}
          bot { ${TELEGRAM_BOT_FIELDS} }
        }
      }`,
      variables: botId ? { botId } : {},
      operationName: "TelegramChannels",
    });
    return data.telegramChannels;
  },

  async getDefaultChannel(): Promise<TelegramChannel | null> {
    const data = await graphqlClient.request<{ telegramDefaultChannel: TelegramChannel | null }>({
      query: `query TelegramDefaultChannel {
        telegramDefaultChannel {
          ${TELEGRAM_CHANNEL_FIELDS}
          bot { ${TELEGRAM_BOT_FIELDS} }
        }
      }`,
      operationName: "TelegramDefaultChannel",
    });
    return data.telegramDefaultChannel;
  },

  async createBot(input: CreateTelegramBotInput): Promise<TelegramBot> {
    const data = await graphqlClient.request<
      { createTelegramBot: TelegramBot },
      { input: CreateTelegramBotInput }
    >({
      query: `mutation CreateTelegramBot($input: CreateTelegramBotInput!) {
        createTelegramBot(input: $input) {
          ${TELEGRAM_BOT_FIELDS}
          channels { ${TELEGRAM_CHANNEL_FIELDS} }
        }
      }`,
      variables: { input },
      operationName: "CreateTelegramBot",
    });
    return data.createTelegramBot;
  },

  async updateBot(id: string, input: UpdateTelegramBotInput): Promise<TelegramBot> {
    const data = await graphqlClient.request<
      { updateTelegramBot: TelegramBot },
      { id: string; input: UpdateTelegramBotInput }
    >({
      query: `mutation UpdateTelegramBot($id: ID!, $input: UpdateTelegramBotInput!) {
        updateTelegramBot(id: $id, input: $input) {
          ${TELEGRAM_BOT_FIELDS}
          channels { ${TELEGRAM_CHANNEL_FIELDS} }
        }
      }`,
      variables: { id, input },
      operationName: "UpdateTelegramBot",
    });
    return data.updateTelegramBot;
  },

  async deleteBot(id: string): Promise<boolean> {
    const data = await graphqlClient.request<
      { deleteTelegramBot: boolean },
      { id: string }
    >({
      query: `mutation DeleteTelegramBot($id: ID!) { deleteTelegramBot(id: $id) }`,
      variables: { id },
      operationName: "DeleteTelegramBot",
    });
    return data.deleteTelegramBot;
  },

  async createChannel(input: CreateTelegramChannelInput): Promise<TelegramChannel> {
    const data = await graphqlClient.request<
      { createTelegramChannel: TelegramChannel },
      { input: CreateTelegramChannelInput }
    >({
      query: `mutation CreateTelegramChannel($input: CreateTelegramChannelInput!) {
        createTelegramChannel(input: $input) {
          ${TELEGRAM_CHANNEL_FIELDS}
          bot { ${TELEGRAM_BOT_FIELDS} }
        }
      }`,
      variables: { input },
      operationName: "CreateTelegramChannel",
    });
    return data.createTelegramChannel;
  },

  async updateChannel(id: string, input: UpdateTelegramChannelInput): Promise<TelegramChannel> {
    const data = await graphqlClient.request<
      { updateTelegramChannel: TelegramChannel },
      { id: string; input: UpdateTelegramChannelInput }
    >({
      query: `mutation UpdateTelegramChannel($id: ID!, $input: UpdateTelegramChannelInput!) {
        updateTelegramChannel(id: $id, input: $input) {
          ${TELEGRAM_CHANNEL_FIELDS}
          bot { ${TELEGRAM_BOT_FIELDS} }
        }
      }`,
      variables: { id, input },
      operationName: "UpdateTelegramChannel",
    });
    return data.updateTelegramChannel;
  },

  async deleteChannel(id: string): Promise<boolean> {
    const data = await graphqlClient.request<
      { deleteTelegramChannel: boolean },
      { id: string }
    >({
      query: `mutation DeleteTelegramChannel($id: ID!) { deleteTelegramChannel(id: $id) }`,
      variables: { id },
      operationName: "DeleteTelegramChannel",
    });
    return data.deleteTelegramChannel;
  },
};
