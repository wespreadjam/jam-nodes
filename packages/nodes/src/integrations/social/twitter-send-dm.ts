import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { twitterRequest } from './twitter-client.js';

interface TwitterSendDMResponse {
  data?: {
    dm_conversation_id?: string;
    dm_event_id?: string;
    text?: string;
  };
}

export const TwitterSendDMInputSchema = z.object({
  recipientId: z.string().min(1),
  text: z.string().min(1),
  mediaId: z.string().optional(),
});

export type TwitterSendDMInput = z.infer<typeof TwitterSendDMInputSchema>;

export const TwitterSendDMOutputSchema = z.object({
  conversationId: z.string(),
  dmEventId: z.string(),
  text: z.string(),
});

export type TwitterSendDMOutput = z.infer<typeof TwitterSendDMOutputSchema>;

export const twitterSendDMNode = defineNode({
  type: 'twitter_send_dm',
  name: 'Twitter Send DM',
  description: 'Send a direct message on Twitter/X',
  category: 'integration',
  inputSchema: TwitterSendDMInputSchema,
  outputSchema: TwitterSendDMOutputSchema,
  estimatedDuration: 8,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const payload: Record<string, unknown> = {
        text: input.text,
      };

      if (input.mediaId) {
        payload['attachments'] = {
          media_id: input.mediaId,
        };
      }

      const response = await twitterRequest<TwitterSendDMResponse>(
        context,
        `/2/dm_conversations/with/${encodeURIComponent(input.recipientId)}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const conversationId = response.data?.dm_conversation_id;
      const dmEventId = response.data?.dm_event_id;
      if (!conversationId || !dmEventId) {
        return {
          success: false,
          error: 'Twitter API returned an invalid DM response.',
        };
      }

      return {
        success: true,
        output: {
          conversationId,
          dmEventId,
          text: response.data?.text || input.text,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send direct message',
      };
    }
  },
});
