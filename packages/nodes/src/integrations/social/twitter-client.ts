import type { NodeExecutionContext } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import { createHmac, randomBytes } from 'crypto';

const TWITTER_API_BASE_URL = 'https://api.twitter.com';

interface TwitterMeResponse {
  data?: {
    id?: string;
  };
}

// =============================================================================
// OAuth 1.0a Signature Generation
// =============================================================================

/**
 * Percent-encode a string per RFC 3986
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Generate a random nonce for OAuth 1.0a
 */
function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Build the OAuth 1.0a Authorization header value.
 *
 * @see https://developer.twitter.com/en/docs/authentication/oauth-1-0a/creating-a-signature
 */
function buildOAuth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  extraParams?: Record<string, string>,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  // OAuth parameters (without oauth_signature)
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Collect all params (OAuth + query string + body form params if applicable)
  const allParams: Record<string, string> = { ...oauthParams };

  // Parse query string params from the URL
  const urlObj = new URL(url);
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  // Include extra params (e.g., from form-encoded body)
  if (extraParams) {
    Object.assign(allParams, extraParams);
  }

  // Sort and encode parameters
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key]!)}`)
    .join('&');

  // Base URL without query string
  const baseUrl = `${urlObj.origin}${urlObj.pathname}`;

  // Signature base string
  const signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  // Signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;

  // HMAC-SHA1 signature
  const signature = createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  oauthParams['oauth_signature'] = signature;

  // Build the header value
  const headerParams = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key]!)}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

// =============================================================================
// Credential Helpers
// =============================================================================

interface TwitterOAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * Check if OAuth 1.0a credentials are available in context.
 * Returns the credentials object or null.
 */
function getOAuth1Credentials(context: NodeExecutionContext): TwitterOAuth1Credentials | null {
  const creds = (context.credentials?.twitter || {}) as Record<string, string | undefined>;
  const consumerKey = creds['consumerKey'];
  const consumerSecret = creds['consumerSecret'];
  const accessToken = creds['accessToken'];
  const accessTokenSecret = creds['accessTokenSecret'];

  if (consumerKey && consumerSecret && accessToken && accessTokenSecret) {
    return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
  }
  return null;
}

export function getTwitterAccessToken(context: NodeExecutionContext): string | null {
  const twitterCredentials = (context.credentials?.twitter || {}) as Record<string, string | undefined>;
  return twitterCredentials['accessToken'] || twitterCredentials['bearerToken'] || null;
}

export function getTwitterAuthHeaders(context: NodeExecutionContext): Record<string, string> {
  const accessToken = getTwitterAccessToken(context);
  if (!accessToken) {
    throw new Error(
      'Twitter access token not configured. Please provide context.credentials.twitter.accessToken.'
    );
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

// =============================================================================
// Twitter API Request
// =============================================================================

export async function twitterRequest<T>(
  context: NodeExecutionContext,
  path: string,
  init: RequestInit
): Promise<T> {
  const fullUrl = `${TWITTER_API_BASE_URL}${path}`;
  const method = (init.method || 'GET').toUpperCase();

  // Build auth headers — prefer OAuth 1.0a (supports read + write)
  const oauth1 = getOAuth1Credentials(context);
  let authHeaders: Record<string, string>;

  if (oauth1) {
    const oauthHeader = buildOAuth1Header(
      method,
      fullUrl,
      oauth1.consumerKey,
      oauth1.consumerSecret,
      oauth1.accessToken,
      oauth1.accessTokenSecret,
    );
    authHeaders = { Authorization: oauthHeader };
  } else {
    authHeaders = getTwitterAuthHeaders(context);
  }

  const response = await fetchWithRetry(
    fullUrl,
    {
      ...init,
      headers: {
        ...authHeaders,
        ...(init.headers || {}),
      },
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getAuthenticatedTwitterUserId(
  context: NodeExecutionContext
): Promise<string> {
  const response = await twitterRequest<TwitterMeResponse>(
    context,
    '/2/users/me',
    {
      method: 'GET',
    }
  );

  const userId = response.data?.id;
  if (!userId) {
    throw new Error('Twitter API error: failed to resolve authenticated user id.');
  }

  return userId;
}
