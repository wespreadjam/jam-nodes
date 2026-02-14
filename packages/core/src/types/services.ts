/**
 * Service interfaces for node integrations.
 * These are optional - nodes work without them but can use them when available.
 * Host applications (like Jam) inject implementations via context.
 */

// =============================================================================
// API Client Interfaces
// =============================================================================

/**
 * Apollo.io API client for contact search and enrichment.
 */
export interface ApolloClient {
  searchContacts(params: {
    personTitles?: string[];
    personLocations?: string[];
    organizationLocations?: string[];
    keywords?: string;
    limit?: number;
    personSeniorities?: string[];
    technologies?: string[];
  }): Promise<ApolloContact[]>;

  enrichContact(contactId: string): Promise<ApolloContact>;
}

export interface ApolloContact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  location?: string;
}

/**
 * DataForSEO API client for SEO analysis.
 */
export interface DataForSeoClient {
  getOnPageInstant(url: string, options?: {
    enableJavascript?: boolean;
  }): Promise<DataForSeoAuditResult>;

  getRelatedKeywords(keywords: string[], options?: {
    locationCode?: number;
    languageCode?: string;
    limit?: number;
  }): Promise<DataForSeoKeyword[]>;
}

export interface DataForSeoAuditResult {
  onPageScore: number;
  checks: Record<string, {
    passed: boolean;
    score: number;
    description?: string;
  }>;
  meta?: {
    title?: string;
    description?: string;
  };
}

export interface DataForSeoKeyword {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  searchIntent: 'informational' | 'commercial' | 'navigational' | 'transactional';
}

/**
 * Twitter/X API client for social monitoring.
 */
export interface TwitterClient {
  searchTweets(query: string, options?: {
    maxResults?: number;
    sinceDays?: number;
  }): Promise<TwitterPost[]>;
}

export interface TwitterPost {
  id: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  createdAt: string;
  url: string;
}

/**
 * ForumScout API client for LinkedIn monitoring.
 */
export interface ForumScoutClient {
  searchLinkedIn(keywords: string[], options?: {
    maxResults?: number;
    timeFilter?: string;
  }): Promise<LinkedInPost[]>;
}

export interface LinkedInPost {
  id: string;
  text: string;
  authorName: string;
  authorHeadline?: string;
  authorUrl?: string;
  authorFollowers?: number;
  likes: number;
  comments: number;
  shares?: number;
  createdAt: string;
  url: string;
  hashtags?: string[];
}

/**
 * OpenAI API client for AI generation.
 */
export interface OpenAIClient {
  generateVideo(params: {
    prompt: string;
    model: 'sora-2' | 'sora-2-pro';
    seconds: number;
    size: string;
  }): Promise<{
    url: string;
    durationSeconds: number;
  }>;

  generateImage(params: {
    prompt: string;
    model?: string;
    size?: string;
  }): Promise<{
    url: string;
  }>;
}

/**
 * Anthropic Claude API client for AI generation.
 */
export interface AnthropicClient {
  generateText(params: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
  }): Promise<string>;

  generateStructured<T>(params: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    schema: unknown; // Zod schema
  }): Promise<T>;
}

// =============================================================================
// Platform Service Interfaces
// =============================================================================

/**
 * Notification service for alerting users.
 */
export interface NotificationService {
  send(params: {
    userId: string;
    title: string;
    message: string;
    channel?: 'slack' | 'email' | 'in-app';
    data?: Record<string, unknown>;
  }): Promise<void>;
}

/**
 * Email drafts service for creating and managing draft emails.
 */
export interface EmailDraftsService {
  createDraft(params: {
    campaignId: string;
    userId: string;
    toEmail: string;
    toName?: string;
    toCompany?: string;
    toTitle?: string;
    subject: string;
    body: string;
    contactId?: string;
  }): Promise<EmailDraft>;
}

export interface EmailDraft {
  id: string;
  toEmail: string;
  toName?: string;
  toCompany?: string;
  toTitle?: string;
  subject: string;
  body: string;
  status: string;
}

/**
 * Analyzed posts storage for social monitoring.
 */
export interface AnalyzedPostsStorage {
  storePosts(params: {
    monitoringConfigId: string;
    posts: AnalyzedPostData[];
  }): Promise<void>;
}

export interface AnalyzedPostData {
  platform: 'twitter' | 'reddit' | 'linkedin';
  externalId: string;
  url: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  authorFollowers?: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  relevanceScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  isComplaint: boolean;
  urgencyLevel: 'low' | 'medium' | 'high';
  aiSummary: string;
  matchedKeywords: string[];
  postedAt: Date;
}

/**
 * Storage service for persisting data.
 */
export interface StorageService {
  save<T>(key: string, data: T): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
}

/**
 * Cache service for caching API responses.
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// =============================================================================
// Combined Services Interface
// =============================================================================

/**
 * All available services that can be injected into node context.
 * All services are optional - nodes should handle missing services gracefully.
 */
export interface NodeServices {
  // API Clients
  apollo?: ApolloClient;
  dataForSeo?: DataForSeoClient;
  twitter?: TwitterClient;
  forumScout?: ForumScoutClient;
  openai?: OpenAIClient;
  anthropic?: AnthropicClient;

  // Platform Services
  notifications?: NotificationService;
  storage?: StorageService;
  cache?: CacheService;
  emailDrafts?: EmailDraftsService;
  analyzedPosts?: AnalyzedPostsStorage;
}
