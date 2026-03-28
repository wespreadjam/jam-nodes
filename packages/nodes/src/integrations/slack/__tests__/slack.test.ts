import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  slackCredential,
  slackSendMessageNode,
  slackUpdateMessageNode,
  slackGetChannelHistoryNode,
  slackSearchMessagesNode,
  SlackSendMessageInputSchema,
  SlackSearchMessagesInputSchema,
  SlackGetChannelHistoryInputSchema,
} from '../index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ─── Credential metadata ──────────────────────────────────────────────────────

describe('slack credentials', () => {
  it('defines oauth2 credential metadata', () => {
    expect(slackCredential.name).toBe('slack');
    expect(slackCredential.type).toBe('oauth2');
  });

  it('includes required scopes', () => {
    const scopes = slackCredential.config.scopes;
    expect(scopes).toContain('chat:write');
    expect(scopes).toContain('channels:read');
    expect(scopes).toContain('search:read');
  });
});

// ─── Schema validation ────────────────────────────────────────────────────────

describe('slack schemas', () => {
  it('validates send message input with optional fields', () => {
    const result = SlackSendMessageInputSchema.safeParse({
      channel: '#general',
      text: 'hello world',
      unfurlLinks: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects send message input missing required text', () => {
    const result = SlackSendMessageInputSchema.safeParse({ channel: '#general' });
    expect(result.success).toBe(false);
  });

  it('applies default limit in channel history schema', () => {
    const result = SlackGetChannelHistoryInputSchema.safeParse({ channel: 'C123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('applies default sort and count in search schema', () => {
    const result = SlackSearchMessagesInputSchema.safeParse({ query: 'deployment' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe('score');
      expect(result.data.count).toBe(20);
    }
  });
});

// ─── slackSendMessage ─────────────────────────────────────────────────────────

describe('slack_send_message', () => {
  it('fails when access token is missing', async () => {
    const result = await slackSendMessageNode.executor(
      { channel: '#general', text: 'hello' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('slack.accessToken');
  });

  it('sends message and returns ts + channel', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          ts: '1700000000.000100',
          channel: 'C123456',
          message: { text: 'hello world' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await slackSendMessageNode.executor(
      { channel: '#general', text: 'hello world' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-test-token', clientId: '', clientSecret: '' } },
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.ts).toBe('1700000000.000100');
      expect(result.output.channel).toBe('C123456');
      expect(result.output.messageText).toBe('hello world');
    }
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe('Bearer xoxb-test-token');
  });

  it('sends thread reply when threadTs is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, ts: '1700000001.000100', channel: 'C123', message: { text: 'reply' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await slackSendMessageNode.executor(
      { channel: 'C123', text: 'reply', threadTs: '1700000000.000100' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));
    expect(body.thread_ts).toBe('1700000000.000100');
  });

  it('includes blocks in payload when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, ts: '1700000002.000100', channel: 'C123', message: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: '*bold*' } }];

    await slackSendMessageNode.executor(
      { channel: 'C123', text: 'fallback', blocks },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));
    expect(body.blocks).toHaveLength(1);
  });

  it('returns error when Slack API responds with ok: false', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: 'channel_not_found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await slackSendMessageNode.executor(
      { channel: '#nonexistent', text: 'hi' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('channel_not_found');
  });
});

// ─── slackUpdateMessage ───────────────────────────────────────────────────────

describe('slack_update_message', () => {
  it('fails when access token is missing', async () => {
    const result = await slackUpdateMessageNode.executor(
      { channel: 'C123', ts: '1700000000.000100', text: 'updated' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('slack.accessToken');
  });

  it('calls chat.update with correct payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          ts: '1700000000.000100',
          channel: 'C123',
          text: 'updated text',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await slackUpdateMessageNode.executor(
      { channel: 'C123', ts: '1700000000.000100', text: 'updated text' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    expect(result.success).toBe(true);
    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('chat.update');
    const body = JSON.parse(String(requestInit.body));
    expect(body.channel).toBe('C123');
    expect(body.ts).toBe('1700000000.000100');
    expect(body.text).toBe('updated text');
  });
});

// ─── slackGetChannelHistory ───────────────────────────────────────────────────

describe('slack_get_channel_history', () => {
  it('fails when access token is missing', async () => {
    const result = await slackGetChannelHistoryNode.executor(
      { channel: 'C123', limit: 10 },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('slack.accessToken');
  });

  it('returns messages with camelCase fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          has_more: false,
          messages: [
            {
              type: 'message',
              ts: '1700000000.000100',
              user: 'U123',
              text: 'hello',
              thread_ts: '1700000000.000100',
              reply_count: 2,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await slackGetChannelHistoryNode.executor(
      { channel: 'C123', limit: 10 },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.messages).toHaveLength(1);
      expect(result.output.messages[0]?.threadTs).toBe('1700000000.000100');
      expect(result.output.messages[0]?.replyCount).toBe(2);
      expect(result.output.hasMore).toBe(false);
    }
  });

  it('appends oldest and latest to query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, messages: [], has_more: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await slackGetChannelHistoryNode.executor(
      { channel: 'C123', oldest: '1699000000.000000', latest: '1700000000.000000' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('oldest=1699000000.000000');
    expect(url).toContain('latest=1700000000.000000');
  });
});

// ─── slackSearchMessages ──────────────────────────────────────────────────────

describe('slack_search_messages', () => {
  it('fails when access token is missing', async () => {
    const result = await slackSearchMessagesNode.executor(
      { query: 'deployment failed' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('slack.accessToken');
  });

  it('returns matched messages with total count', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          query: 'deploy',
          messages: {
            total: 2,
            matches: [
              {
                type: 'message',
                ts: '1700000000.000100',
                text: 'deploy complete',
                channel: { id: 'C123', name: 'ops' },
                username: 'bot',
                permalink: 'https://slack.com/archives/C123/p1700000000000100',
              },
              {
                type: 'message',
                ts: '1700000001.000200',
                text: 'deploy failed',
                channel: { id: 'C123', name: 'ops' },
                username: 'bot',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await slackSearchMessagesNode.executor(
      { query: 'deploy', sort: 'timestamp', count: 10 },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { slack: { accessToken: 'xoxb-token', clientId: '', clientSecret: '' } },
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.total).toBe(2);
      expect(result.output.matches).toHaveLength(2);
      expect(result.output.matches[0]?.permalink).toBe(
        'https://slack.com/archives/C123/p1700000000000100'
      );
      expect(result.output.matches[1]?.permalink).toBeUndefined();
    }

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('sort=timestamp');
    expect(url).toContain('count=10');
  });
});
