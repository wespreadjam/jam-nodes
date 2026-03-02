import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  twitterCredential,
  twitterCreateTweetNode,
  twitterDeleteTweetNode,
  twitterLikeTweetNode,
  twitterRetweetNode,
  twitterSearchTweetsNode,
  twitterSendDMNode,
  twitterGetUserByUsernameNode,
} from './index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const baseContext = {
  userId: 'u1',
  workflowExecutionId: 'w1',
  variables: {},
  resolveNestedPath: () => undefined,
};

describe('twitter credential', () => {
  it('defines oauth2 pkce credential metadata', () => {
    expect(twitterCredential.name).toBe('twitter');
    expect(twitterCredential.type).toBe('oauth2_pkce');
    expect(twitterCredential.config.authorizationUrl).toBe('https://twitter.com/i/oauth2/authorize');
    expect(twitterCredential.config.tokenUrl).toBe('https://api.twitter.com/2/oauth2/token');
    expect(twitterCredential.config.pkce).toBe(true);
  });
});

describe('twitter_create_tweet', () => {
  it('fails when access token is missing', async () => {
    const result = await twitterCreateTweetNode.executor(
      { text: 'hello' },
      baseContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('context.credentials.twitter.accessToken');
  });

  it('creates tweet with optional fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 't1', text: 'hello' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterCreateTweetNode.executor(
      {
        text: 'hello',
        replyToTweetId: 'parent_1',
        mediaIds: ['m1'],
        quoteTweetId: 'q1',
        poll: {
          options: ['a', 'b'],
          durationMinutes: 60,
        },
      },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.twitter.com/2/tweets');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer x_token');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(String(init.body));
    expect(body.reply.in_reply_to_tweet_id).toBe('parent_1');
    expect(body.media.media_ids).toEqual(['m1']);
    expect(body.quote_tweet_id).toBe('q1');
    expect(body.poll.duration_minutes).toBe(60);
  });
});

describe('twitter_delete_tweet', () => {
  it('deletes tweet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { deleted: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterDeleteTweetNode.executor(
      { tweetId: '123' },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.twitter.com/2/tweets/123');
    expect(init.method).toBe('DELETE');
  });
});

describe('twitter_like_tweet', () => {
  it('likes tweet using authenticated user id', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'u123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { liked: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterLikeTweetNode.executor(
      { tweetId: '321' },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.twitter.com/2/users/me');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.twitter.com/2/users/u123/likes');
  });
});

describe('twitter_retweet', () => {
  it('retweets tweet using authenticated user id', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'u123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { retweeted: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterRetweetNode.executor(
      { tweetId: '654' },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.twitter.com/2/users/me');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.twitter.com/2/users/u123/retweets');
  });
});

describe('twitter_search_tweets', () => {
  it('searches tweets with query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: 't1', text: 'hello', author_id: 'u1', created_at: '2026-02-20T00:00:00.000Z' }],
          meta: { result_count: 1, next_token: 'next_1' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterSearchTweetsNode.executor(
      {
        query: 'jam nodes',
        maxResults: 10,
        sortOrder: 'recency',
      },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('https://api.twitter.com/2/tweets/search/recent?');
    expect(url).toContain('query=jam+nodes');
    expect(url).toContain('max_results=10');
    expect(url).toContain('sort_order=recency');
  });
});

describe('twitter_send_dm', () => {
  it('sends direct message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            dm_conversation_id: 'conv_1',
            dm_event_id: 'evt_1',
            text: 'hello',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterSendDMNode.executor(
      {
        recipientId: '999',
        text: 'hello',
        mediaId: 'media_1',
      },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.twitter.com/2/dm_conversations/with/999/messages');
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body.attachments.media_id).toBe('media_1');
  });
});

describe('twitter_get_user_by_username', () => {
  it('gets user by username', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'u1',
            username: 'jam',
            name: 'Jam',
            description: 'test',
            verified: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await twitterGetUserByUsernameNode.executor(
      { username: 'jam' },
      {
        ...baseContext,
        credentials: { twitter: { accessToken: 'x_token' } },
      }
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.twitter.com/2/users/by/username/jam?user.fields=description,verified'
    );
  });
});
