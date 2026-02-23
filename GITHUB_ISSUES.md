# GitHub Issues for jam-nodes

This document contains GitHub issue templates for expanding jam-nodes integrations. Specs are derived from n8n's open-source node implementations.

---

## Current State

### Already Implemented
| Category | Nodes |
|----------|-------|
| Logic | `conditionalNode`, `endNode`, `delayNode` |
| Transform | `mapNode`, `filterNode` |
| HTTP | `httpRequestNode` |
| Social Monitoring | `redditMonitorNode`, `twitterMonitorNode`, `linkedinMonitorNode` |
| SEO | `seoKeywordResearchNode`, `seoAuditNode` |
| Contact Discovery | `searchContactsNode` (Apollo) |
| AI | `socialKeywordGeneratorNode`, `draftEmailsNode`, `socialAiAnalyzeNode` |
| Video | `soraVideoNode` |

---

## Credential System Architecture

### How Credentials Work in jam-nodes

jam-nodes defines **what credentials are needed** (schemas), while the consuming application (e.g., Jam/Minions) handles:
- OAuth flows and redirects
- Token storage and encryption
- Token refresh
- Injecting authenticated services into node context

```
┌─────────────────────────────────────────────────────────────────┐
│  jam-nodes (Open Source)                                        │
│  - Credential schemas (what auth is needed)                     │
│  - Service interfaces (what methods exist)                      │
│  - Node implementations (how to use services)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Consuming Application (e.g., Jam/Minions)                      │
│  - OAuth redirect handling                                      │
│  - Token storage in database                                    │
│  - Token refresh logic                                          │
│  - context.getCredentials() implementation                      │
└─────────────────────────────────────────────────────────────────┘
```

### Credential Types

| Type | Description | Example Services |
|------|-------------|------------------|
| `apiKey` | Simple API key in header/query | Hunter, DataForSEO, SendGrid |
| `oauth2` | OAuth 2.0 Authorization Code flow | HubSpot, Google, Slack, LinkedIn |
| `oauth2_pkce` | OAuth 2.0 with PKCE | Twitter/X |
| `bearer` | Bearer token authentication | Airtable, Notion |
| `basic` | Username/password | WordPress |

---

## Priority 0: Primitives

### Issue #1: `[Node] loopNode - Iterate over arrays with rate limiting`

**Category:** Primitives
**Priority:** P0
**Complexity:** Medium

**Description:**
Create a loop node that iterates over an array of items, executing child nodes for each item with built-in rate limiting support.

**Input Schema:**
```typescript
{
  items: any[];           // Array to iterate over
  concurrency?: number;   // Max parallel executions (default: 1)
  delayMs?: number;       // Delay between iterations in ms
  continueOnError?: boolean;
}
```

**Output Schema:**
```typescript
{
  results: any[];         // Results from each iteration
  errors?: { index: number; error: string }[];
}
```

**Acceptance Criteria:**
- [ ] Sequential iteration by default
- [ ] Optional parallel execution with concurrency limit
- [ ] Rate limiting via delay parameter
- [ ] Error handling per item with continue option
- [ ] Zod schemas for input/output
- [ ] Unit tests

---

### Issue #2: `[Node] retryNode - Retry failed operations with backoff`

**Category:** Primitives
**Priority:** P0
**Complexity:** Low
**Labels:** `good-first-issue`

**Description:**
Wrap any operation with automatic retry logic using exponential backoff.

**Input Schema:**
```typescript
{
  maxRetries: number;           // Max retry attempts (1-10)
  initialDelayMs?: number;      // Initial delay (default: 1000)
  maxDelayMs?: number;          // Max delay cap (default: 30000)
  backoffMultiplier?: number;   // Multiplier (default: 2)
  retryOn?: string[];           // Error types to retry on
}
```

**Reference:** Common pattern in n8n HTTP Request node

---

### Issue #3: `[Node] rateLimiterNode - Respect API rate limits`

**Category:** Primitives
**Priority:** P0
**Complexity:** Medium

**Description:**
Rate limiter that queues requests to stay within API limits.

**Input Schema:**
```typescript
{
  requestsPerWindow: number;    // Max requests allowed
  windowMs: number;             // Time window in ms
  strategy: 'fixed' | 'sliding';
}
```

---

### Issue #4: `[Node] webhookTriggerNode - Receive incoming webhooks`

**Category:** Primitives
**Priority:** P0
**Complexity:** High

**Description:**
Create an endpoint to receive incoming webhook payloads.

**Input Schema:**
```typescript
{
  path: string;                 // Webhook URL path
  method: 'GET' | 'POST' | 'PUT';
  authentication?: {
    type: 'none' | 'basic' | 'header';
    credentials?: Record<string, string>;
  };
  responseCode?: number;
  responseData?: any;
}
```

---

### Issue #5: `[Node] cacheNode - Cache API responses`

**Category:** Primitives
**Priority:** P1
**Complexity:** Medium

**Description:**
Cache results from expensive operations with TTL support.

**Input Schema:**
```typescript
{
  key: string;              // Cache key (supports interpolation)
  ttlSeconds: number;       // Time to live
  action: 'get' | 'set' | 'delete' | 'getOrSet';
  value?: any;              // Value for set operations
}
```

---

## Priority 0: Contact Discovery & Enrichment

### Issue #6: `[Integration] Hunter.io - Email finder and verifier`

**Category:** Contact Discovery
**Priority:** P0
**Complexity:** Medium
**Reference:** [n8n Hunter node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Hunter)

**Description:**
Integrate with Hunter.io API for email finding and verification.

**Credential Definition:**
```typescript
export const HunterCredential = {
  name: 'hunter',
  type: 'apiKey' as const,
  displayName: 'Hunter API',
  documentationUrl: 'https://hunter.io/api-documentation/v2',
  schema: z.object({
    apiKey: z.string().describe('API Key from Hunter dashboard'),
  }),
  // How to use in requests
  authenticate: {
    type: 'query',
    properties: {
      api_key: '{{apiKey}}',
    },
  },
};
```

**Operations:**

#### `hunterDomainSearch`
Find all emails associated with a domain.
```typescript
// Input
{
  domain: string;           // Required: domain to search
  limit?: number;           // 1-100, default 10
  type?: 'personal' | 'generic';
  seniority?: ('junior' | 'senior' | 'executive')[];
  department?: ('sales' | 'marketing' | 'hr' | 'it' | 'finance' | 'executive')[];
}

// Output
{
  emails: {
    value: string;
    type: string;
    confidence: number;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
    sources: { domain: string; uri: string }[];
  }[];
  meta: { results: number; limit: number; offset: number };
}
```

#### `hunterEmailFinder`
Find email from name and domain.
```typescript
// Input
{
  domain: string;           // Required
  firstName: string;        // Required
  lastName: string;         // Required
}

// Output
{
  email: string;
  score: number;
  position: string;
  company: string;
}
```

#### `hunterEmailVerifier`
Verify email deliverability.
```typescript
// Input
{ email: string; }          // Required

// Output
{
  status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
  score: number;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
}
```

**API Docs:** https://hunter.io/api-documentation/v2

---

### Issue #7: `[Integration] Clearbit - Person and company enrichment`

**Category:** Contact Discovery
**Priority:** P0
**Complexity:** Medium
**Reference:** [n8n Clearbit node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Clearbit)

**Description:**
Integrate with Clearbit for contact and company enrichment.

**Credential Definition:**
```typescript
export const ClearbitCredential = {
  name: 'clearbit',
  type: 'apiKey' as const,
  displayName: 'Clearbit API',
  documentationUrl: 'https://clearbit.com/docs',
  schema: z.object({
    apiKey: z.string().describe('Clearbit API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{apiKey}}',
    },
  },
};
```

**Operations:**

#### `clearbitEnrichPerson`
Enrich person data from email.
```typescript
// Input
{
  email: string;            // Required
  givenName?: string;
  familyName?: string;
  company?: string;
  companyDomain?: string;
  linkedIn?: string;
  twitter?: string;
}

// Output
{
  id: string;
  name: { givenName: string; familyName: string; fullName: string };
  email: string;
  location: string;
  employment: { name: string; title: string; role: string; seniority: string };
  social: { linkedin: string; twitter: string };
}
```

#### `clearbitEnrichCompany`
Enrich company data from domain.
```typescript
// Input
{
  domain: string;           // Required
}

// Output
{
  id: string;
  name: string;
  domain: string;
  category: { sector: string; industryGroup: string; industry: string };
  metrics: { employees: number; estimatedAnnualRevenue: string };
  social: { linkedin: string; twitter: string };
}
```

#### `clearbitCompanyAutocomplete`
Suggest companies from partial name.
```typescript
// Input
{ name: string; }           // Required

// Output
{ companies: { name: string; domain: string; logo: string }[] }
```

---

### Issue #8: `[Integration] Dropcontact - GDPR-compliant B2B enrichment`

**Category:** Contact Discovery
**Priority:** P1
**Complexity:** Medium
**Reference:** [n8n Dropcontact node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Dropcontact)

**Description:**
Integrate with Dropcontact for GDPR-compliant email finding and enrichment.

**Credential Definition:**
```typescript
export const DropcontactCredential = {
  name: 'dropcontact',
  type: 'apiKey' as const,
  displayName: 'Dropcontact API',
  documentationUrl: 'https://developer.dropcontact.io/',
  schema: z.object({
    apiKey: z.string().describe('Dropcontact API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      'X-Access-Token': '{{apiKey}}',
    },
  },
};
```

**Operations:**

#### `dropcontactEnrich`
```typescript
// Input
{
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  website?: string;
  linkedinUrl?: string;
  phone?: string;
  language?: 'en' | 'fr';
  siren?: string;           // French company ID
}

// Output
{
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  company: string;
  website: string;
  linkedin: string;
  phone: string;
  mobile_phone: string;
  civility: string;
  siren: string;
}
```

---

### Issue #9: `[Integration] Apollo - Extended operations`

**Category:** Contact Discovery
**Priority:** P0
**Complexity:** Medium

**Description:**
Extend existing Apollo integration with additional operations.

**Credential Definition:**
```typescript
export const ApolloCredential = {
  name: 'apollo',
  type: 'apiKey' as const,
  displayName: 'Apollo.io API',
  documentationUrl: 'https://apolloio.github.io/apollo-api-docs/',
  schema: z.object({
    apiKey: z.string().describe('Apollo API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      'X-Api-Key': '{{apiKey}}',
    },
  },
};
```

**New Operations:**

#### `apolloEnrichPerson`
```typescript
// Input
{ email: string; }

// Output - Full Apollo person object with employment, social, etc.
```

#### `apolloEnrichCompany`
```typescript
// Input
{ domain: string; }

// Output - Full Apollo company object
```

#### `apolloGetEmailStatus`
```typescript
// Input
{ email: string; }

// Output
{ status: 'valid' | 'invalid' | 'unknown'; deliverability: string }
```

---

## Priority 0: Email Outreach

### Issue #10: `[Integration] SendGrid - Transactional email`

**Category:** Email
**Priority:** P0
**Complexity:** Medium
**Reference:** [n8n SendGrid node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/SendGrid)

**Description:**
Integrate with SendGrid for sending transactional emails.

**Credential Definition:**
```typescript
export const SendGridCredential = {
  name: 'sendgrid',
  type: 'apiKey' as const,
  displayName: 'SendGrid API',
  documentationUrl: 'https://docs.sendgrid.com/api-reference',
  schema: z.object({
    apiKey: z.string().describe('SendGrid API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{apiKey}}',
    },
  },
};
```

**Operations:**

#### `sendgridSendEmail`
```typescript
// Input
{
  to: string | string[];
  from: string;
  subject: string;
  content: {
    type: 'text/plain' | 'text/html';
    value: string;
  };
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  sendAt?: number;          // Unix timestamp for scheduling
  attachments?: {
    content: string;        // Base64
    filename: string;
    type: string;
  }[];
}

// Output
{ messageId: string; status: 'sent' | 'scheduled' }
```

#### `sendgridCreateContact`
```typescript
// Input
{
  email: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, any>;
  listIds?: string[];
}
```

#### `sendgridGetContacts`
```typescript
// Input
{ listId?: string; limit?: number; offset?: number; }
```

---

### Issue #11: `[Integration] Instantly - Cold email automation`

**Category:** Email
**Priority:** P0
**Complexity:** High

**Description:**
Integrate with Instantly.ai for cold email campaigns.

**Credential Definition:**
```typescript
export const InstantlyCredential = {
  name: 'instantly',
  type: 'apiKey' as const,
  displayName: 'Instantly API',
  documentationUrl: 'https://developer.instantly.ai/',
  schema: z.object({
    apiKey: z.string().describe('Instantly API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{apiKey}}',
    },
  },
};
```

**Operations:**

#### `instantlyAddLead`
```typescript
// Input
{
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  personalization?: string;
  customVariables?: Record<string, string>;
}
```

#### `instantlyCreateCampaign`
```typescript
// Input
{
  name: string;
  emailAccounts: string[];
  sequences: {
    subject: string;
    body: string;
    delayDays: number;
  }[];
}
```

#### `instantlyGetAnalytics`
```typescript
// Input
{ campaignId: string; }

// Output
{
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}
```

**API Docs:** https://developer.instantly.ai/

---

### Issue #12: `[Integration] Lemlist - Personalized cold email`

**Category:** Email
**Priority:** P1
**Complexity:** Medium
**Reference:** [n8n Lemlist node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Lemlist)

**Description:**
Integrate with Lemlist for personalized cold email campaigns.

**Credential Definition:**
```typescript
export const LemlistCredential = {
  name: 'lemlist',
  type: 'apiKey' as const,
  displayName: 'Lemlist API',
  documentationUrl: 'https://developer.lemlist.com/',
  schema: z.object({
    apiKey: z.string().describe('Lemlist API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: '{{apiKey}}',
    },
  },
};
```

**Operations:**
- `lemlistAddLead` - Add lead to campaign
- `lemlistGetCampaigns` - List all campaigns
- `lemlistGetActivity` - Get campaign activity/events
- `lemlistPauseLead` - Pause outreach to specific lead
- `lemlistResumeLead` - Resume outreach to specific lead
- `lemlistMarkAsInterested` - Mark lead as interested

---

## Priority 0: Social Platforms

### Issue #13: `[Integration] Reddit - Extended operations`

**Category:** Social
**Priority:** P0
**Complexity:** Medium
**Reference:** [n8n Reddit node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Reddit)

**Description:**
Extend existing Reddit integration with posting and engagement capabilities.

**Credential Definition:**
```typescript
export const RedditCredential = {
  name: 'reddit',
  type: 'oauth2' as const,
  displayName: 'Reddit OAuth2',
  documentationUrl: 'https://www.reddit.com/dev/api/',
  config: {
    authorizationUrl: 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: 'https://www.reddit.com/api/v1/access_token',
    scopes: ['identity', 'submit', 'read', 'history', 'mysubreddits'],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
  }),
};
```

**New Operations:**

#### `redditCreatePost`
```typescript
// Input
{
  subreddit: string;
  title: string;
  kind: 'self' | 'link' | 'image';
  text?: string;            // For self posts
  url?: string;             // For link posts
  flair?: string;
  sendReplies?: boolean;
}
```

#### `redditCreateComment`
```typescript
// Input
{
  postId: string;
  text: string;
}
```

#### `redditReplyToComment`
```typescript
// Input
{
  commentId: string;
  text: string;
}
```

#### `redditSearchPosts`
```typescript
// Input
{
  query: string;
  subreddit?: string;
  sort?: 'relevance' | 'hot' | 'top' | 'new';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}
```

#### `redditGetPostComments`
```typescript
// Input
{
  postId: string;
  sort?: 'best' | 'top' | 'new' | 'controversial';
  limit?: number;
}
```

---

### Issue #14: `[Integration] Twitter/X - Extended operations`

**Category:** Social
**Priority:** P0
**Complexity:** Medium
**Reference:** [n8n Twitter node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Twitter)

**Description:**
Extend existing Twitter integration with posting and engagement capabilities.

**Credential Definition:**
```typescript
export const TwitterCredential = {
  name: 'twitter',
  type: 'oauth2' as const,
  displayName: 'Twitter/X OAuth2',
  documentationUrl: 'https://developer.twitter.com/en/docs',
  config: {
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'follows.read',
      'follows.write',
      'dm.read',
      'dm.write',
      'like.read',
      'like.write',
      'offline.access',
    ],
    pkce: true,  // Twitter requires PKCE
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
  }),
};
```

**New Operations:**

#### `twitterCreateTweet`
```typescript
// Input
{
  text: string;
  replyToTweetId?: string;
  mediaIds?: string[];
  quoteTweetId?: string;
  poll?: {
    options: string[];
    durationMinutes: number;
  };
}
```

#### `twitterDeleteTweet`
```typescript
// Input
{ tweetId: string; }
```

#### `twitterLikeTweet`
```typescript
// Input
{ tweetId: string; }
```

#### `twitterRetweet`
```typescript
// Input
{ tweetId: string; }
```

#### `twitterSearchTweets`
```typescript
// Input
{
  query: string;
  maxResults?: number;
  startTime?: string;
  endTime?: string;
  sortOrder?: 'recency' | 'relevancy';
}
```

#### `twitterSendDM`
```typescript
// Input
{
  recipientId: string;
  text: string;
  mediaId?: string;
}
```

#### `twitterGetUserByUsername`
```typescript
// Input
{ username: string; }
```

---

### Issue #15: `[Integration] LinkedIn - Extended operations`

**Category:** Social
**Priority:** P0
**Complexity:** Medium
**Reference:** [n8n LinkedIn node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/LinkedIn)

**Description:**
Extend existing LinkedIn integration with posting capabilities.

**Credential Definition:**
```typescript
export const LinkedInCredential = {
  name: 'linkedin',
  type: 'oauth2' as const,
  displayName: 'LinkedIn OAuth2',
  documentationUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication',
  config: {
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
      'r_organization_social',
      'w_organization_social',
    ],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.number(),
  }),
};
```

**New Operations:**

#### `linkedinCreatePost`
```typescript
// Input
{
  text: string;
  visibility: 'PUBLIC' | 'CONNECTIONS';
  postAs: 'person' | 'organization';
  organizationId?: string;
  mediaCategory?: 'NONE' | 'IMAGE' | 'ARTICLE';
  imageUrl?: string;
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
}
```

**Note:** LinkedIn API does not support scraping profiles. Recommend PhantomBuster/Apify for that use case.

---

### Issue #16: `[Integration] Discord - Send messages and manage channels`

**Category:** Social
**Priority:** P1
**Complexity:** Medium
**Reference:** [n8n Discord node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Discord)

**Description:**
Integrate with Discord for community engagement.

**Credential Definition:**
```typescript
// Option 1: Bot Token (for bots)
export const DiscordBotCredential = {
  name: 'discordBot',
  type: 'apiKey' as const,
  displayName: 'Discord Bot Token',
  documentationUrl: 'https://discord.com/developers/docs',
  schema: z.object({
    botToken: z.string().describe('Discord Bot Token'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bot {{botToken}}',
    },
  },
};

// Option 2: Webhook (simpler, for sending messages only)
export const DiscordWebhookCredential = {
  name: 'discordWebhook',
  type: 'webhook' as const,
  displayName: 'Discord Webhook',
  schema: z.object({
    webhookUrl: z.string().url().describe('Discord Webhook URL'),
  }),
};
```

**Operations:**

#### `discordSendMessage`
```typescript
// Input
{
  channelId: string;
  content: string;
  embeds?: {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
  }[];
  username?: string;        // For webhooks
  avatarUrl?: string;       // For webhooks
}
```

#### `discordSendWebhook`
```typescript
// Input
{
  webhookUrl: string;
  content: string;
  embeds?: object[];
}
```

#### `discordCreateThread`
```typescript
// Input
{
  channelId: string;
  name: string;
  message?: string;
}
```

---

### Issue #17: `[Integration] Slack - Messages and channels`

**Category:** Social
**Priority:** P1
**Complexity:** Medium
**Reference:** [n8n Slack node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Slack)

**Description:**
Integrate with Slack for team communication.

**Credential Definition:**
```typescript
export const SlackCredential = {
  name: 'slack',
  type: 'oauth2' as const,
  displayName: 'Slack OAuth2',
  documentationUrl: 'https://api.slack.com/docs',
  config: {
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'channels:read',
      'channels:write',
      'chat:write',
      'chat:write.public',
      'files:write',
      'groups:read',
      'im:read',
      'im:write',
      'users:read',
    ],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    teamId: z.string(),
  }),
};
```

**Operations:**

#### `slackSendMessage`
```typescript
// Input
{
  channel: string;          // Channel ID or name
  text: string;
  blocks?: object[];        // Block Kit blocks
  attachments?: object[];
  threadTs?: string;        // For threading
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
}
```

#### `slackUpdateMessage`
```typescript
// Input
{
  channel: string;
  ts: string;               // Message timestamp
  text: string;
}
```

#### `slackGetChannelHistory`
```typescript
// Input
{
  channel: string;
  limit?: number;
  oldest?: string;
  latest?: string;
}
```

#### `slackSearchMessages`
```typescript
// Input
{
  query: string;
  sort?: 'score' | 'timestamp';
  count?: number;
}
```

---

## Priority 1: CRM & Sales

### Issue #18: `[Integration] HubSpot - Full CRM operations`

**Category:** CRM
**Priority:** P1
**Complexity:** High
**Reference:** [n8n HubSpot node](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Hubspot)

**Description:**
Integrate with HubSpot CRM for contact and deal management.

**Credential Definition:**
```typescript
export const HubSpotCredential = {
  name: 'hubspot',
  type: 'oauth2' as const,
  displayName: 'HubSpot OAuth2',
  documentationUrl: 'https://developers.hubspot.com/docs/api/oauth-quickstart-guide',
  config: {
    authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.schemas.contacts.read',
      'crm.schemas.companies.read',
      'crm.schemas.deals.read',
      'crm.objects.owners.read',
      'forms',
      'tickets',
    ],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
  }),
};
```

**Resources & Operations:**

#### Contacts
- `hubspotCreateContact` - Create new contact
- `hubspotUpdateContact` - Update existing contact
- `hubspotGetContact` - Get single contact by ID/email
- `hubspotSearchContacts` - Search with filters
- `hubspotDeleteContact` - Delete contact
- `hubspotGetRecentContacts` - Get recently modified

#### Companies
- `hubspotCreateCompany` - Create new company
- `hubspotUpdateCompany` - Update existing company
- `hubspotGetCompany` - Get single company
- `hubspotSearchCompanies` - Search with filters
- `hubspotSearchByDomain` - Find company by domain

#### Deals
- `hubspotCreateDeal` - Create new deal
- `hubspotUpdateDeal` - Update existing deal
- `hubspotGetDeal` - Get single deal
- `hubspotSearchDeals` - Search with filters

#### Lists
- `hubspotAddToList` - Add contacts to list
- `hubspotRemoveFromList` - Remove contacts from list

**Input Example (Create Contact):**
```typescript
{
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecycleStage?: 'subscriber' | 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead' | 'opportunity' | 'customer';
  customProperties?: Record<string, any>;
}
```

---

### Issue #19: `[Integration] Pipedrive - Sales pipeline CRM`

**Category:** CRM
**Priority:** P2
**Complexity:** High

**Description:**
Integrate with Pipedrive for sales pipeline management.

**Credential Definition:**
```typescript
export const PipedriveCredential = {
  name: 'pipedrive',
  type: 'oauth2' as const,
  displayName: 'Pipedrive OAuth2',
  documentationUrl: 'https://developers.pipedrive.com/docs/api/v1',
  config: {
    authorizationUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: ['deals:full', 'contacts:full', 'activities:full'],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
  }),
};
```

**Operations:**
- `pipedriveCreatePerson` - Create contact
- `pipedriveCreateOrganization` - Create company
- `pipedriveCreateDeal` - Create deal
- `pipedriveUpdateDeal` - Update deal stage
- `pipedriveAddNote` - Add note to record
- `pipedriveCreateActivity` - Log call/meeting

---

## Priority 1: Data & Storage

### Issue #20: `[Integration] Google Sheets - Spreadsheet operations`

**Category:** Data
**Priority:** P1
**Complexity:** Medium

**Description:**
Integrate with Google Sheets for data storage and manipulation.

**Credential Definition:**
```typescript
export const GoogleSheetsCredential = {
  name: 'googleSheets',
  type: 'oauth2' as const,
  displayName: 'Google Sheets OAuth2',
  documentationUrl: 'https://developers.google.com/sheets/api',
  config: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
  }),
};
```

**Operations:**

#### `sheetsAppendRows`
```typescript
// Input
{
  spreadsheetId: string;
  sheetName: string;
  rows: Record<string, any>[];
}
```

#### `sheetsReadRows`
```typescript
// Input
{
  spreadsheetId: string;
  sheetName: string;
  range?: string;           // e.g., "A1:D10"
  filters?: Record<string, any>;
}
```

#### `sheetsUpdateRow`
```typescript
// Input
{
  spreadsheetId: string;
  sheetName: string;
  rowNumber: number;
  data: Record<string, any>;
}
```

#### `sheetsClearSheet`
```typescript
// Input
{
  spreadsheetId: string;
  sheetName: string;
  range?: string;
}
```

---

### Issue #21: `[Integration] Airtable - Database operations`

**Category:** Data
**Priority:** P1
**Complexity:** Medium

**Description:**
Integrate with Airtable for database operations.

**Credential Definition:**
```typescript
export const AirtableCredential = {
  name: 'airtable',
  type: 'bearer' as const,
  displayName: 'Airtable Personal Access Token',
  documentationUrl: 'https://airtable.com/developers/web/api/authentication',
  schema: z.object({
    accessToken: z.string().describe('Airtable Personal Access Token'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{accessToken}}',
    },
  },
};
```

**Operations:**

#### `airtableCreateRecord`
```typescript
// Input
{
  baseId: string;
  tableId: string;
  fields: Record<string, any>;
}
```

#### `airtableGetRecords`
```typescript
// Input
{
  baseId: string;
  tableId: string;
  filterByFormula?: string;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  maxRecords?: number;
}
```

#### `airtableUpdateRecord`
```typescript
// Input
{
  baseId: string;
  tableId: string;
  recordId: string;
  fields: Record<string, any>;
}
```

#### `airtableDeleteRecord`
```typescript
// Input
{
  baseId: string;
  tableId: string;
  recordId: string;
}
```

---

### Issue #22: `[Integration] Notion - Workspace operations`

**Category:** Data
**Priority:** P2
**Complexity:** Medium

**Description:**
Integrate with Notion for workspace management.

**Credential Definition:**
```typescript
export const NotionCredential = {
  name: 'notion',
  type: 'bearer' as const,
  displayName: 'Notion Integration Token',
  documentationUrl: 'https://developers.notion.com/docs/getting-started',
  schema: z.object({
    accessToken: z.string().describe('Notion Internal Integration Token'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{accessToken}}',
      'Notion-Version': '2022-06-28',
    },
  },
};
```

**Operations:**
- `notionCreatePage` - Create page in database
- `notionUpdatePage` - Update page properties
- `notionQueryDatabase` - Query database with filters
- `notionAppendBlocks` - Add content blocks to page

---

## Priority 1: Web Scraping

### Issue #23: `[Integration] Apify - Run actors and get results`

**Category:** Scraping
**Priority:** P1
**Complexity:** Medium

**Description:**
Integrate with Apify for running pre-built scrapers.

**Credential Definition:**
```typescript
export const ApifyCredential = {
  name: 'apify',
  type: 'bearer' as const,
  displayName: 'Apify API Token',
  documentationUrl: 'https://docs.apify.com/platform/integrations/api',
  schema: z.object({
    apiToken: z.string().describe('Apify API Token'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{apiToken}}',
    },
  },
};
```

**Operations:**

#### `apifyRunActor`
```typescript
// Input
{
  actorId: string;          // e.g., "apify/web-scraper"
  input: Record<string, any>;
  waitForFinish?: boolean;
  timeout?: number;
}
```

#### `apifyGetDataset`
```typescript
// Input
{
  datasetId: string;
  limit?: number;
  offset?: number;
  format?: 'json' | 'csv';
}
```

#### `apifyGetRunStatus`
```typescript
// Input
{ runId: string; }
```

**Popular Actors for Distribution:**
- `apify/linkedin-profile-scraper`
- `apify/twitter-scraper`
- `apify/google-search-scraper`
- `curious_coder/linkedin-post-search-scraper`

---

### Issue #24: `[Integration] Firecrawl - AI-powered web scraping`

**Category:** Scraping
**Priority:** P1
**Complexity:** Medium

**Description:**
Integrate with Firecrawl for AI-powered web content extraction.

**Credential Definition:**
```typescript
export const FirecrawlCredential = {
  name: 'firecrawl',
  type: 'bearer' as const,
  displayName: 'Firecrawl API Key',
  documentationUrl: 'https://docs.firecrawl.dev/',
  schema: z.object({
    apiKey: z.string().describe('Firecrawl API Key'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{apiKey}}',
    },
  },
};
```

**Operations:**

#### `firecrawlScrape`
```typescript
// Input
{
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
  onlyMainContent?: boolean;
  waitFor?: number;
}
```

#### `firecrawlCrawl`
```typescript
// Input
{
  url: string;
  maxDepth?: number;
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
}
```

#### `firecrawlExtract`
```typescript
// Input
{
  url: string;
  schema: Record<string, any>;  // JSON schema for extraction
  prompt?: string;
}
```

---

## Priority 2: Content Publishing

### Issue #25: `[Integration] WordPress - Blog publishing`

**Category:** Content
**Priority:** P2
**Complexity:** Medium

**Description:**
Integrate with WordPress for blog management.

**Credential Definition:**
```typescript
// WordPress supports multiple auth methods
export const WordPressCredential = {
  name: 'wordpress',
  type: 'basic' as const,
  displayName: 'WordPress Application Password',
  documentationUrl: 'https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/',
  schema: z.object({
    siteUrl: z.string().url().describe('WordPress site URL'),
    username: z.string().describe('WordPress username'),
    applicationPassword: z.string().describe('Application password (not your regular password)'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Basic {{base64(username:applicationPassword)}}',
    },
  },
};
```

**Operations:**

#### `wordpressCreatePost`
```typescript
// Input
{
  title: string;
  content: string;
  status: 'publish' | 'draft' | 'pending' | 'private';
  categories?: number[];
  tags?: number[];
  featuredMediaId?: number;
  excerpt?: string;
  slug?: string;
}
```

#### `wordpressUpdatePost`
```typescript
// Input
{
  postId: number;
  title?: string;
  content?: string;
  status?: string;
}
```

#### `wordpressGetPosts`
```typescript
// Input
{
  status?: string;
  perPage?: number;
  page?: number;
  search?: string;
}
```

---

### Issue #26: `[Integration] Dev.to - Developer blogging`

**Category:** Content
**Priority:** P2
**Complexity:** Low
**Labels:** `good-first-issue`

**Description:**
Integrate with Dev.to for developer content publishing.

**Credential Definition:**
```typescript
export const DevToCredential = {
  name: 'devto',
  type: 'apiKey' as const,
  displayName: 'Dev.to API Key',
  documentationUrl: 'https://developers.forem.com/api',
  schema: z.object({
    apiKey: z.string().describe('Dev.to API Key from settings'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      'api-key': '{{apiKey}}',
    },
  },
};
```

**Operations:**

#### `devtoCreateArticle`
```typescript
// Input
{
  title: string;
  bodyMarkdown: string;
  published?: boolean;
  tags?: string[];
  series?: string;
  canonicalUrl?: string;
  description?: string;
}
```

#### `devtoUpdateArticle`
```typescript
// Input
{
  articleId: number;
  title?: string;
  bodyMarkdown?: string;
  published?: boolean;
}
```

#### `devtoGetArticles`
```typescript
// Input
{
  username?: string;
  perPage?: number;
  page?: number;
}
```

---

## Priority 2: SEO (Extended)

### Issue #27: `[Integration] DataForSEO - Extended operations`

**Category:** SEO
**Priority:** P1
**Complexity:** Medium

**Description:**
Extend existing DataForSEO integration with additional capabilities.

**Credential Definition:**
```typescript
export const DataForSEOCredential = {
  name: 'dataforseo',
  type: 'basic' as const,
  displayName: 'DataForSEO API',
  documentationUrl: 'https://docs.dataforseo.com/',
  schema: z.object({
    login: z.string().describe('DataForSEO login email'),
    password: z.string().describe('DataForSEO API password'),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Basic {{base64(login:password)}}',
    },
  },
};
```

**New Operations:**

#### `dataforseoGetBacklinks`
```typescript
// Input
{
  target: string;           // Domain or URL
  limit?: number;
  filters?: {
    dofollow?: boolean;
    anchorContains?: string;
  };
}
```

#### `dataforseoPeopleAlsoAsk`
```typescript
// Input
{
  keyword: string;
  location?: string;
  language?: string;
}
```

#### `dataforseoSerp`
```typescript
// Input
{
  keyword: string;
  location?: string;
  device?: 'desktop' | 'mobile';
  depth?: number;
}
```

---

## Credential Implementation Guide

### How to Add a New Credential

1. Create credential definition in `packages/core/src/credentials/`:

```typescript
// packages/core/src/credentials/hunter.ts
import { z } from 'zod';
import { CredentialDefinition } from '../types';

export const HunterCredential: CredentialDefinition = {
  name: 'hunter',
  type: 'apiKey',
  displayName: 'Hunter API',
  documentationUrl: 'https://hunter.io/api-documentation/v2',
  schema: z.object({
    apiKey: z.string().min(1, 'API Key is required'),
  }),
  authenticate: {
    type: 'query',
    properties: {
      api_key: '{{apiKey}}',
    },
  },
};
```

2. Export from credentials index:

```typescript
// packages/core/src/credentials/index.ts
export * from './hunter';
export * from './clearbit';
// ...
```

3. Node uses credential via context:

```typescript
// In node implementation
async execute(input, context) {
  const credentials = await context.getCredentials('hunter');
  // credentials.apiKey is available
}
```

---

## Labels for GitHub Issues

Use these labels:
- `good-first-issue` - Simple implementations
- `help-wanted` - Community contributions welcome
- `integration` - New integration nodes
- `primitive` - Core framework nodes
- `credential` - Credential definition needed
- `priority-p0` / `priority-p1` / `priority-p2`
- `complexity-low` / `complexity-medium` / `complexity-high`

---

## Issue Template

```markdown
## [Category] Node Name - Brief Description

**Category:** (Primitives | Contact Discovery | Email | Social | CRM | Data | Scraping | Content | SEO)
**Priority:** (P0 | P1 | P2)
**Complexity:** (Low | Medium | High)
**Reference:** [Link to n8n implementation or API docs]

### Description
Brief description of what this node does and why it's needed.

### Credential Definition
```typescript
export const ExampleCredential = {
  name: 'example',
  type: 'apiKey' | 'oauth2' | 'bearer' | 'basic',
  // ... full credential schema
};
```

### Operations
List each operation with input/output schemas.

### API Documentation
Link to official API docs.

### Acceptance Criteria
- [ ] Credential definition with Zod schema
- [ ] Zod schemas for all inputs/outputs
- [ ] TypeScript types exported
- [ ] Unit tests
- [ ] Error handling
- [ ] Rate limiting consideration (if applicable)
- [ ] Documentation in README

### Notes
Any additional context or implementation notes.
```
