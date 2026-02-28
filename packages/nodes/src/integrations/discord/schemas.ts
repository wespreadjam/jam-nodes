import { z } from 'zod';

export const DiscordEmbedFieldSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  inline: z.boolean().optional(),
});

export const DiscordEmbedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  timestamp: z.string().optional(),
  color: z.number().int().min(0).max(16777215).optional(),
  footer: z
    .object({
      text: z.string(),
      icon_url: z.string().url().optional(),
    })
    .optional(),
  image: z
    .object({
      url: z.string().url(),
    })
    .optional(),
  thumbnail: z
    .object({
      url: z.string().url(),
    })
    .optional(),
  author: z
    .object({
      name: z.string(),
      url: z.string().url().optional(),
      icon_url: z.string().url().optional(),
    })
    .optional(),
  fields: z.array(DiscordEmbedFieldSchema).optional(),
});

export const DiscordSendMessageInputSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1),
  embeds: z.array(DiscordEmbedSchema).optional(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const DiscordSendMessageOutputSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  guildId: z.string().nullable(),
  url: z.string().url(),
  content: z.string().nullable(),
  embedsCount: z.number(),
});

export const DiscordSendWebhookInputSchema = z.object({
  webhookUrl: z.string().url().optional(),
  content: z.string().min(1),
  embeds: z.array(DiscordEmbedSchema).optional(),
});

export const DiscordSendWebhookOutputSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  guildId: z.string().nullable(),
  content: z.string().nullable(),
  embedsCount: z.number(),
});

export const DiscordCreateThreadInputSchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(1),
  message: z.string().optional(),
});

export const DiscordCreateThreadOutputSchema = z.object({
  threadId: z.string(),
  parentChannelId: z.string(),
  name: z.string(),
  starterMessageId: z.string().nullable(),
  threadType: z.number().nullable(),
});

export type DiscordEmbed = z.infer<typeof DiscordEmbedSchema>;
export type DiscordSendMessageInput = z.infer<typeof DiscordSendMessageInputSchema>;
export type DiscordSendMessageOutput = z.infer<typeof DiscordSendMessageOutputSchema>;
export type DiscordSendWebhookInput = z.infer<typeof DiscordSendWebhookInputSchema>;
export type DiscordSendWebhookOutput = z.infer<typeof DiscordSendWebhookOutputSchema>;
export type DiscordCreateThreadInput = z.infer<typeof DiscordCreateThreadInputSchema>;
export type DiscordCreateThreadOutput = z.infer<typeof DiscordCreateThreadOutputSchema>;
