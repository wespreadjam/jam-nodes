# Built-in Nodes Reference (`@jam-nodes/nodes`)

All built-in nodes are exported individually and as `builtInNodes` array for bulk registration:

```typescript
import { builtInNodes } from '@jam-nodes/nodes';
registry.registerAll(builtInNodes);
```

---

## Logic Nodes

### `conditional`

Branch workflow based on a condition.

- **Category:** `logic`
- **Estimated Duration:** 0s
- **Capabilities:** `supportsRerun`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `condition` | object | ✅ | Condition to evaluate |
| `condition.type` | enum | ✅ | `'equals'` \| `'not_equals'` \| `'greater_than'` \| `'less_than'` \| `'contains'` \| `'exists'` |
| `condition.variableName` | string | ✅ | Variable path to check (supports dot notation) |
| `condition.value` | unknown | ❌ | Value to compare against |
| `trueNodeId` | string | ✅ | Node ID to execute if condition is true |
| `falseNodeId` | string | ✅ | Node ID to execute if condition is false |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `conditionMet` | boolean | Whether the condition evaluated to true |
| `selectedBranch` | `'true'` \| `'false'` | Which branch was selected |

Returns `nextNodeId` for workflow branching.

```typescript
{
  condition: { type: 'greater_than', variableName: 'contacts.length', value: 0 },
  trueNodeId: 'send-emails',
  falseNodeId: 'no-contacts'
}
```

---

### `end`

Mark the end of a workflow branch.

- **Category:** `logic`
- **Estimated Duration:** 0s

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ❌ | Optional completion message |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `completed` | boolean | Always `true` |
| `message` | string? | Echo of input message |

---

### `delay`

Pause workflow execution for a specified duration.

- **Category:** `logic`
- **Capabilities:** `supportsCancel`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `durationMs` | number | ✅ | Duration in ms (0–3,600,000 = max 1 hour) |
| `message` | string | ❌ | Optional log message |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `waited` | boolean | Always `true` |
| `actualDurationMs` | number | Actual time waited |
| `message` | string? | Echo of input message |

---

## Transform Nodes

### `map`

Extract a property from each item in an array.

- **Category:** `transform`
- **Estimated Duration:** 0s
- **Capabilities:** `supportsRerun`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | unknown[] | ✅ | Array of items to transform |
| `path` | string | ✅ | Property path to extract (dot notation) |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `results` | unknown[] | Extracted values |
| `count` | number | Number of results |

```typescript
{ items: '{{contacts}}', path: 'email' }
// → { results: ['a@example.com', 'b@example.com'], count: 2 }
```

---

### `filter`

Filter items in an array based on a condition.

- **Category:** `transform`
- **Estimated Duration:** 0s
- **Capabilities:** `supportsRerun`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | unknown[] | ✅ | Array to filter |
| `path` | string | ✅ | Property path to check (dot notation) |
| `operator` | enum | ✅ | `'equals'` \| `'not_equals'` \| `'contains'` \| `'not_contains'` \| `'greater_than'` \| `'less_than'` \| `'exists'` \| `'not_exists'` |
| `value` | unknown | ❌ | Value to compare against |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `results` | unknown[] | Filtered items |
| `count` | number | Filtered count |
| `originalCount` | number | Original array length |

```typescript
{ items: '{{contacts}}', path: 'email', operator: 'exists' }
```

---

## Example Nodes

### `http_request`

Make HTTP requests to external APIs.

- **Category:** `integration`
- **Estimated Duration:** 5s
- **Capabilities:** `supportsRerun`, `supportsCancel`
- **Services:** None (uses native `fetch`)

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string (URL) | ✅ | — | URL to request |
| `method` | enum | ❌ | `'GET'` | `'GET'` \| `'POST'` \| `'PUT'` \| `'PATCH'` \| `'DELETE'` |
| `headers` | Record\<string, string\> | ❌ | — | Request headers |
| `body` | unknown | ❌ | — | Request body (JSON-serialized for POST/PUT/PATCH) |
| `timeout` | number | ❌ | 30000 | Timeout in ms (1000–60000) |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | number | HTTP status code |
| `statusText` | string | Status text |
| `headers` | Record\<string, string\> | Response headers |
| `body` | unknown | Parsed response (JSON or text) |
| `ok` | boolean | Whether status is 2xx |
| `durationMs` | number | Request duration |

---

## Integration Nodes

### `reddit_monitor`

Search Reddit for posts matching keywords. Uses public Reddit search.json API — **no authentication required**.

- **Category:** `integration`
- **Estimated Duration:** 20s
- **Capabilities:** `supportsRerun`
- **Services:** Optional `notifications`

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `keywords` | string[] | ✅ | — | Keywords to search for |
| `timeFilter` | enum | ❌ | `'day'` | `'hour'` \| `'day'` \| `'week'` \| `'month'` \| `'year'` \| `'all'` |
| `sortBy` | enum | ❌ | `'new'` | `'relevance'` \| `'hot'` \| `'top'` \| `'new'` \| `'comments'` |
| `maxResults` | number | ❌ | 50 | Max results (capped at 100) |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `posts` | RedditPost[] | Array of posts with `id`, `platform`, `url`, `text`, `title`, `authorName`, `authorHandle`, `authorUrl`, `subreddit`, `engagement{likes,comments,shares}`, `upvoteRatio`, `postedAt` |
| `totalFound` | number | Number of posts found |
| `subredditsSearched` | string[] | Always `['all']` |

---

### `twitter_monitor`

Search Twitter/X for posts matching keywords.

- **Category:** `integration`
- **Estimated Duration:** 15s
- **Capabilities:** `supportsRerun`
- **Services:** **Required** `twitter`; Optional `notifications`

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `keywords` | string[] | ✅ | — | Keywords to search |
| `excludeRetweets` | boolean | ❌ | `true` | Exclude retweets |
| `minLikes` | number | ❌ | — | Minimum likes filter |
| `maxResults` | number | ❌ | 50 | Max results |
| `lang` | string | ❌ | — | Language filter (e.g. `'en'`) |
| `sinceDays` | number | ❌ | — | Search tweets from last N days |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `posts` | TwitterPost[] | Posts with `id`, `platform`, `url`, `text`, `authorName`, `authorHandle`, `authorUrl`, `authorFollowers`, `engagement{likes,comments,shares,views}`, `postedAt` |
| `totalFound` | number | Count |
| `hasMore` | boolean | Always `false` (simplified) |
| `cursor` | string? | Pagination cursor |

---

### `linkedin_monitor`

Search LinkedIn for posts via ForumScout API.

- **Category:** `integration`
- **Estimated Duration:** 60s
- **Capabilities:** `supportsRerun`
- **Services:** **Required** `forumScout`; Optional `notifications`

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `keywords` | string[] | ✅ | — | Keywords to search |
| `timeFilter` | string | ❌ | — | Time filter |
| `maxResults` | number | ❌ | 50 | Max results |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `posts` | LinkedInPost[] | Posts with `id`, `platform`, `url`, `text`, `authorName`, `authorHandle`, `authorUrl`, `authorFollowers`, `authorHeadline?`, `engagement{likes,comments,shares}`, `hashtags`, `postedAt` |
| `totalFound` | number | Count |

---

### `sora_video`

Generate AI video using OpenAI Sora 2.

- **Category:** `integration`
- **Estimated Duration:** 60s
- **Capabilities:** `supportsRerun`
- **Services:** **Required** `openai`

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | string | ✅ | — | Video description |
| `model` | enum | ❌ | `'sora-2'` | `'sora-2'` \| `'sora-2-pro'` |
| `seconds` | 4 \| 8 \| 12 | ❌ | 4 | Video duration |
| `size` | enum | ❌ | `'1280x720'` | `'720x1280'` \| `'1280x720'` \| `'1024x1792'` \| `'1792x1024'` |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `video` | object | `{ url, durationSeconds, size, model }` |
| `processingTimeSeconds` | number | Time taken to generate |

---

### `seo_keyword_research`

Research keywords with search volume, difficulty, CPC, and intent data.

- **Category:** `integration`
- **Estimated Duration:** 10s
- **Capabilities:** `supportsRerun`
- **Services:** **Required** `dataForSeo`

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `seedKeywords` | string[] | ✅ | — | Seed keywords to research |
| `locationCode` | number | ❌ | 2840 (US) | Location code |
| `languageCode` | string | ❌ | `'en'` | Language code |
| `limit` | number | ❌ | 30 | Max keywords per seed |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `keywords` | array | `{ keyword, searchVolume, keywordDifficulty, cpc (string), searchIntent }` |
| `totalResearched` | number | Total keywords returned |

`searchIntent` is `'informational'` \| `'commercial'` \| `'navigational'` \| `'transactional'`.

---

### `seo_audit`

Run comprehensive SEO audit on a URL.

- **Category:** `integration`
- **Estimated Duration:** 30s
- **Capabilities:** `supportsRerun`
- **Services:** **Required** `dataForSeo`; Optional `notifications`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL) | ❌ | URL to audit. Can also come from `context.variables.site_url` |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `overallScore` | number \| null | SEO score 0–100 |
| `issues` | array | `{ id, title, description, score, displayValue? }` |
| `passedAudits` | number | Count of passed checks |
| `failedAudits` | number | Count of failed checks |
| `url` | string \| null | Audited URL |
| `skipped` | boolean? | True if audit was skipped |
| `awaitingUrl` | boolean? | True if no URL provided |
| `meta` | object? | `{ title?, description?, canonical?, htags? }` |
| `performance` | object? | `{ timeToInteractive?, largestContentfulPaint?, domComplete? }` |
| `links` | object? | `{ internal, external, broken }` |
| `resources` | object? | `{ images, scripts, stylesheets }` |
| `content` | object? | `{ wordCount, textRatio, readabilityScore? }` |
| `extractedKeywords` | string[]? | Keywords found on page |

---

### `search_contacts`

Search for contacts using Apollo.io with email enrichment.

- **Category:** `integration`
- **Estimated Duration:** 5s
- **Capabilities:** `supportsEnrichment`, `supportsBulkActions`, `supportsRerun`
- **Services:** **Required** `apollo`

**Input Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `personTitles` | string[] | ❌ | — | Job titles to search |
| `personLocations` | string[] | ❌ | — | Person locations |
| `organizationLocations` | string[] | ❌ | — | Organization locations |
| `employeeRanges` | string[] | ❌ | — | Employee count ranges (e.g. `"1-10"`) |
| `keywords` | string | ❌ | — | Search keywords |
| `limit` | number | ❌ | 10 | Max contacts (capped at 100) |
| `includeSimilarTitles` | boolean | ❌ | — | Include similar titles |
| `personSeniorities` | string[] | ❌ | — | e.g. `"vp"`, `"director"` |
| `technologies` | string[] | ❌ | — | Technologies used |
| `industryTagIds` | string[] | ❌ | — | Industry tags |
| `departments` | string[] | ❌ | — | e.g. `"engineering"`, `"sales"` |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `contacts` | array | `{ id, name, firstName?, lastName?, email, title?, company, linkedinUrl?, location? }` |
| `totalFound` | number | Total contacts found (before enrichment filtering) |

---

## AI Nodes

### `social_keyword_generator`

Generate platform-specific search keywords from a topic description using Claude.

- **Category:** `action`
- **Estimated Duration:** 15s
- **Capabilities:** `supportsRerun`
- **Services:** **Required** `anthropic`; Optional `notifications`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | ✅ | Natural language topic description |
| `userKeywords` | string[] | ❌ | User-specified keywords to include |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `topic` | string | Echo of input topic |
| `twitter` | object | `{ keywords: string[], searchQuery: string }` |
| `reddit` | object | `{ keywords: string[] }` |
| `linkedin` | object | `{ keywords: string[], searchQueries: string[] }` |
| `allKeywords` | string[] | All unique keywords across platforms |

---

### `draft_emails`

Generate personalized email drafts for contacts using Claude.

- **Category:** `action`
- **Estimated Duration:** 30s
- **Capabilities:** `supportsRerun`, `supportsBulkActions`
- **Services:** **Required** `anthropic`, `emailDrafts`
- **Context Requirements:** `campaignId` must be set; `variables.senderName` must exist

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | Contact[] | ✅ | Array of `{ id, name, email (nullable), title (nullable), company (nullable) }` |
| `productDescription` | string | ✅ | Product/service description |
| `emailTemplate` | string | ❌ | Optional email template |
| `subject` | string | ❌ | Optional subject line |
| `approval` | object | ❌ | `{ required: boolean, message?: string }` |

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `emails` | DraftEmailInfo[] | `{ id, toEmail, toName, toCompany, toTitle, subject, body, status }` |
| `draftedCount` | number | Number of emails drafted |

---

### `social_ai_analyze`

Analyze social media posts for relevance, sentiment, complaints, and urgency using Claude.

- **Category:** `action`
- **Estimated Duration:** 60s
- **Capabilities:** `supportsRerun`, `supportsBulkActions`
- **Services:** **Required** `anthropic`; Optional `analyzedPosts`, `notifications`

**Input Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `twitterPosts` | SocialPost[] | ❌ | Posts from Twitter monitor |
| `redditPosts` | SocialPost[] | ❌ | Posts from Reddit monitor |
| `linkedinPosts` | SocialPost[] | ❌ | Posts from LinkedIn monitor |
| `posts` | SocialPost[] | ❌ | Legacy field (backwards compat) |
| `topic` | string | ✅ | Original topic for context |
| `userIntent` | string | ✅ | What the user is looking for |
| `monitoringConfigId` | string | ❌ | For storage service |

`SocialPost` shape: `{ id, platform, url, text, title?, authorName, authorHandle, authorUrl, authorFollowers?, engagement{likes,comments,shares,views?}, postedAt }`

**Output Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `analyzedPosts` | AnalyzedPost[] | All analyzed posts (sorted by relevance desc) |
| `highPriorityPosts` | AnalyzedPost[] | Posts with urgency=high or relevance≥80 |
| `complaints` | AnalyzedPost[] | Posts flagged as complaints |
| `totalAnalyzed` | number | Count |
| `highPriorityCount` | number | Count |
| `complaintCount` | number | Count |
| `averageRelevance` | number | Average relevance score |

`AnalyzedPost` extends `SocialPost` with: `relevanceScore`, `sentiment` (`'positive'`\|`'negative'`\|`'neutral'`), `isComplaint`, `urgencyLevel` (`'low'`\|`'medium'`\|`'high'`), `aiSummary`, `matchedKeywords`.
