export type TelegramBot = {
  id: string;
  name: string;
  username?: string | null;
  tokenMasked: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  channels?: TelegramChannel[];
};

export type TelegramChannel = {
  id: string;
  name: string;
  chatId: string;
  botId: string;
  isDefault: boolean;
  isActive: boolean;
  publicUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  bot?: TelegramBot | null;
};

export type CreateTelegramBotInput = {
  name: string;
  token: string;
  isActive?: boolean;
};

export type UpdateTelegramBotInput = {
  name?: string | null;
  token?: string | null;
  isActive?: boolean | null;
};

export type CreateTelegramChannelInput = {
  name: string;
  chatId: string;
  botId: string;
  isDefault?: boolean;
  isActive?: boolean;
  publicUrl?: string | null;
};

export type UpdateTelegramChannelInput = {
  name?: string | null;
  chatId?: string | null;
  botId?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  publicUrl?: string | null;
};

export type CropGuideTelegramPublication = {
  id: string;
  cropGuideId: string;
  channelId?: string | null;
  botId?: string | null;
  channelName?: string | null;
  botName?: string | null;
  telegramMessageId: string;
  telegramPostUrl?: string | null;
  publishedAt: string;
  channel?: TelegramChannel | null;
  bot?: TelegramBot | null;
};
