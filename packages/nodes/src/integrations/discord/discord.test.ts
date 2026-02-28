import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discordBotCredential,
  discordWebhookCredential,
  discordCreateThreadNode,
  discordSendMessageNode,
  discordSendWebhookNode,
  DiscordEmbedSchema,
} from './index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('discord credentials', () => {
  it('defines bot credential metadata', () => {
    expect(discordBotCredential.name).toBe('discordBot');
    expect(discordBotCredential.type).toBe('apiKey');
    expect(discordBotCredential.authenticate.properties.Authorization).toBe(
      'Bot {{botToken}}'
    );
  });

  it('defines webhook credential metadata', () => {
    expect(discordWebhookCredential.name).toBe('discordWebhook');
    expect(discordWebhookCredential.type).toBe('webhook');
  });
});

describe('discord schemas', () => {
  it('supports embeds with fields', () => {
    const parsed = DiscordEmbedSchema.safeParse({
      title: 'Release Update',
      description: 'v1.2 shipped',
      color: 16711680,
      fields: [{ name: 'Status', value: 'Live', inline: true }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('discord_send_message', () => {
  it('fails when bot token is missing', async () => {
    const result = await discordSendMessageNode.executor(
      { channelId: '123', content: 'hello' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('discordBot.botToken');
  });

  it('sends message payload including embeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'm1',
          channel_id: '123',
          guild_id: '456',
          content: 'hello',
          embeds: [{ title: 'Release Update' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await discordSendMessageNode.executor(
      {
        channelId: '123',
        content: 'hello',
        embeds: [{ title: 'Release Update' }],
      },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { discordBot: { botToken: 'token_abc' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.method).toBe('POST');
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      'Bot token_abc'
    );
    const body = JSON.parse(String(requestInit.body));
    expect(body.embeds).toHaveLength(1);
  });
});

describe('discord_send_webhook', () => {
  it('uses credential webhook URL when input URL is omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'm2',
          channel_id: 'ch1',
          guild_id: 'g1',
          content: 'ping',
          embeds: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await discordSendWebhookNode.executor(
      { content: 'ping' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: {
          discordWebhook: {
            webhookUrl: 'https://discord.com/api/webhooks/1/abc',
          },
        },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://discord.com/api/webhooks/1/abc?wait=true'
    );
  });
});

describe('discord_create_thread', () => {
  it('creates standalone thread when message is not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'thread1',
          parent_id: '123',
          name: 'QA Thread',
          type: 11,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await discordCreateThreadNode.executor(
      { channelId: '123', name: 'QA Thread' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { discordBot: { botToken: 'token_abc' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/channels/123/threads');
  });

  it('creates starter message then thread when message is provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'message1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'thread2',
            parent_id: '123',
            name: 'Ops Thread',
            type: 11,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await discordCreateThreadNode.executor(
      { channelId: '123', name: 'Ops Thread', message: 'Starter post' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { discordBot: { botToken: 'token_abc' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/channels/123/messages');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      '/channels/123/messages/message1/threads'
    );
  });
});
