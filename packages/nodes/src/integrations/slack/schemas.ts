import { z } from 'zod';

// ----- Shared sub-schemas -----

export const SlackBlockSchema = z.record(z.unknown());

export const SlackAttachmentSchema = z.object({
  fallback: z.string().optional(),
  color: z.string().optional(),
  pretext: z.string().optional(),
  author_name: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  footer: z.string().optional(),
  ts: z.string().optional(),
  fields: z
    .array(
      z.object({
        title: z.string(),
        value: z.string(),
        short: z.boolean().optional(),
      })
    )
    .optional(),
});

// ----- slackSendMessage -----

export const SlackSendMessageInputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  text: z.string().min(1, 'Message text is required'),
  blocks: z.array(SlackBlockSchema).optional(),
  attachments: z.array(SlackAttachmentSchema).optional(),
  threadTs: z.string().optional(),
  unfurlLinks: z.boolean().optional(),
  unfurlMedia: z.boolean().optional(),
});

export const SlackSendMessageOutputSchema = z.object({
  ok: z.boolean(),
  ts: z.string(),
  channel: z.string(),
  messageText: z.string().nullable(),
});

// ----- slackUpdateMessage -----

export const SlackUpdateMessageInputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  ts: z.string().min(1, 'Message timestamp (ts) is required'),
  text: z.string().min(1, 'Updated text is required'),
});

export const SlackUpdateMessageOutputSchema = z.object({
  ok: z.boolean(),
  ts: z.string(),
  channel: z.string(),
  messageText: z.string().nullable(),
});

// ----- slackGetChannelHistory -----

export const SlackGetChannelHistoryInputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  oldest: z.string().optional(),
  latest: z.string().optional(),
});

export const SlackMessageSchema = z.object({
  type: z.string(),
  ts: z.string(),
  user: z.string().optional(),
  text: z.string().optional(),
  threadTs: z.string().optional(),
  replyCount: z.number().optional(),
});

export const SlackGetChannelHistoryOutputSchema = z.object({
  ok: z.boolean(),
  messages: z.array(SlackMessageSchema),
  hasMore: z.boolean(),
});

// ----- slackSearchMessages -----

export const SlackSearchMessagesInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  sort: z.enum(['score', 'timestamp']).optional().default('score'),
  count: z.number().int().min(1).max(100).optional().default(20),
});

export const SlackSearchMatchSchema = z.object({
  type: z.string(),
  ts: z.string(),
  text: z.string(),
  channel: z.object({ id: z.string(), name: z.string() }),
  username: z.string().optional(),
  permalink: z.string().optional(),
});

export const SlackSearchMessagesOutputSchema = z.object({
  ok: z.boolean(),
  query: z.string(),
  total: z.number(),
  matches: z.array(SlackSearchMatchSchema),
});

// ----- Inferred types -----

export type SlackBlock = z.infer<typeof SlackBlockSchema>;
export type SlackAttachment = z.infer<typeof SlackAttachmentSchema>;
export type SlackMessage = z.infer<typeof SlackMessageSchema>;
export type SlackSearchMatch = z.infer<typeof SlackSearchMatchSchema>;

export type SlackSendMessageInput = z.infer<typeof SlackSendMessageInputSchema>;
export type SlackSendMessageOutput = z.infer<typeof SlackSendMessageOutputSchema>;

export type SlackUpdateMessageInput = z.infer<typeof SlackUpdateMessageInputSchema>;
export type SlackUpdateMessageOutput = z.infer<typeof SlackUpdateMessageOutputSchema>;

export type SlackGetChannelHistoryInput = z.infer<typeof SlackGetChannelHistoryInputSchema>;
export type SlackGetChannelHistoryOutput = z.infer<typeof SlackGetChannelHistoryOutputSchema>;

export type SlackSearchMessagesInput = z.infer<typeof SlackSearchMessagesInputSchema>;
export type SlackSearchMessagesOutput = z.infer<typeof SlackSearchMessagesOutputSchema>;
