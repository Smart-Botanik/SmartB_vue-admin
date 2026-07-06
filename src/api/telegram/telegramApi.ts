import { graphqlClient } from "@/services/graphql/client";
import type {
  CreateTelegramBotInput,
  CreateTelegramChannelInput,
  CropGuideTelegramPublication,
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

const TELEGRAM_PUBLICATION_FIELDS = `
  id
  cropGuideId
  channelId
  botId
  channelName
  botName
  telegramMessageId
  telegramPostUrl
  publishedAt
  channel {
    ${TELEGRAM_CHANNEL_FIELDS}
    bot { ${TELEGRAM_BOT_FIELDS} }
  }
  bot { ${TELEGRAM_BOT_FIELDS} }
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

  async listChannels(botId?: string, isActive?: boolean): Promise<TelegramChannel[]> {
    const data = await graphqlClient.request<
      { telegramChannels: TelegramChannel[] },
      { botId?: string; isActive?: boolean }
    >({
      query: `query TelegramChannels($botId: ID, $isActive: Boolean) {
        telegramChannels(botId: $botId, isActive: $isActive) {
          ${TELEGRAM_CHANNEL_FIELDS}
          bot { ${TELEGRAM_BOT_FIELDS} }
        }
      }`,
      variables: {
        ...(botId ? { botId } : {}),
        ...(isActive != null ? { isActive } : {}),
      },
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

  async listGuidePublications(
    cropGuideId: string,
    limit = 4,
  ): Promise<CropGuideTelegramPublication[]> {
    const data = await graphqlClient.request<
      { cropGuideTelegramPublications: CropGuideTelegramPublication[] },
      { cropGuideId: string; limit: number }
    >({
      query: `query CropGuideTelegramPublications($cropGuideId: ID!, $limit: Int) {
        cropGuideTelegramPublications(cropGuideId: $cropGuideId, limit: $limit) {
          ${TELEGRAM_PUBLICATION_FIELDS}
        }
      }`,
      variables: { cropGuideId, limit },
      operationName: "CropGuideTelegramPublications",
    });
    return data.cropGuideTelegramPublications;
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
