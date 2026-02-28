// Logic nodes
export {
  conditionalNode,
  endNode,
  delayNode,
  ConditionalInputSchema,
  ConditionalOutputSchema,
  ConditionSchema,
  ConditionTypeSchema,
  EndInputSchema,
  EndOutputSchema,
  DelayInputSchema,
  DelayOutputSchema,
} from './logic/index.js';

export type {
  ConditionalInput,
  ConditionalOutput,
  Condition,
  ConditionType,
  EndInput,
  EndOutput,
  DelayInput,
  DelayOutput,
} from './logic/index.js';

// Transform nodes
export {
  mapNode,
  filterNode,
  sortNode,
  MapInputSchema,
  MapOutputSchema,
  FilterInputSchema,
  FilterOutputSchema,
  FilterOperatorSchema,
  SortInputSchema,
  SortOutputSchema,
  SortDirectionSchema,
} from './transform/index.js';

export type {
  MapInput,
  MapOutput,
  FilterInput,
  FilterOutput,
  FilterOperator,
  SortInput,
  SortOutput,
  SortDirection,
} from './transform/index.js';

// Example nodes
export {
  httpRequestNode,
  HttpRequestInputSchema,
  HttpRequestOutputSchema,
  HttpMethodSchema,
  breadNode,
  BreadInputSchema,
  BreadOutputSchema,
} from './examples/index.js';

export type {
  HttpRequestInput,
  HttpRequestOutput,
  HttpMethod,
  BreadInput,
  BreadOutput,
} from './examples/index.js';

// Integration nodes
export {
  // Social
  redditMonitorNode,
  RedditMonitorInputSchema,
  RedditMonitorOutputSchema,
  twitterMonitorNode,
  TwitterMonitorInputSchema,
  TwitterMonitorOutputSchema,
  linkedinMonitorNode,
  LinkedInMonitorInputSchema,
  LinkedInMonitorOutputSchema,
  // OpenAI
  soraVideoNode,
  SoraVideoInputSchema,
  SoraVideoOutputSchema,
  // DataForSEO
  seoKeywordResearchNode,
  SeoKeywordResearchInputSchema,
  SeoKeywordResearchOutputSchema,
  seoAuditNode,
  SeoAuditInputSchema,
  SeoAuditOutputSchema,
  // Apollo
  searchContactsNode,
  SearchContactsInputSchema,
  SearchContactsOutputSchema,
  // Discord
  discordSendMessageNode,
  DiscordSendMessageInputSchema,
  DiscordSendMessageOutputSchema,
  discordSendWebhookNode,
  DiscordSendWebhookInputSchema,
  DiscordSendWebhookOutputSchema,
  discordCreateThreadNode,
  DiscordCreateThreadInputSchema,
  DiscordCreateThreadOutputSchema,
  DiscordEmbedSchema,
  discordBotCredential,
  discordWebhookCredential,
} from './integrations/index.js';

export type {
  RedditMonitorInput,
  RedditMonitorOutput,
  RedditPost,
  TwitterMonitorInput,
  TwitterMonitorOutput,
  TwitterPost,
  LinkedInMonitorInput,
  LinkedInMonitorOutput,
  LinkedInPost,
  SoraVideoInput,
  SoraVideoOutput,
  SeoKeywordResearchInput,
  SeoKeywordResearchOutput,
  SeoAuditInput,
  SeoAuditOutput,
  SeoIssue,
  SearchContactsInput,
  SearchContactsOutput,
  DiscordSendMessageInput,
  DiscordSendMessageOutput,
  DiscordSendWebhookInput,
  DiscordSendWebhookOutput,
  DiscordCreateThreadInput,
  DiscordCreateThreadOutput,
  DiscordEmbed,
} from './integrations/index.js';

// AI nodes
export {
  socialKeywordGeneratorNode,
  SocialKeywordGeneratorInputSchema,
  SocialKeywordGeneratorOutputSchema,
  draftEmailsNode,
  DraftEmailsInputSchema,
  DraftEmailsOutputSchema,
  DraftEmailInfoSchema,
  ContactSchema,
  socialAiAnalyzeNode,
  SocialAiAnalyzeInputSchema,
  SocialAiAnalyzeOutputSchema,
} from './ai/index.js';

export type {
  SocialKeywordGeneratorInput,
  SocialKeywordGeneratorOutput,
  DraftEmailsInput,
  DraftEmailsOutput,
  DraftEmailInfo,
  Contact,
  SocialAiAnalyzeInput,
  SocialAiAnalyzeOutput,
  SocialPost,
  AnalyzedPost,
} from './ai/index.js';

// All nodes as a collection
import { conditionalNode } from './logic/index.js';
import { endNode } from './logic/index.js';
import { delayNode } from './logic/index.js';
import { mapNode, filterNode, sortNode } from './transform/index.js';
import { httpRequestNode, breadNode } from './examples/index.js';
import {
  redditMonitorNode,
  twitterMonitorNode,
  linkedinMonitorNode,
  soraVideoNode,
  seoKeywordResearchNode,
  seoAuditNode,
  searchContactsNode,
  discordSendMessageNode,
  discordSendWebhookNode,
  discordCreateThreadNode,
} from './integrations/index.js';
import {
  socialKeywordGeneratorNode,
  draftEmailsNode,
  socialAiAnalyzeNode,
} from './ai/index.js';

/**
 * All built-in nodes as an array for easy registration
 */
export const builtInNodes = [
  // Logic
  conditionalNode,
  endNode,
  delayNode,
  // Transform
  mapNode,
  filterNode,
  sortNode,
  // Examples
  httpRequestNode,
  breadNode,
  // Integrations
  redditMonitorNode,
  twitterMonitorNode,
  linkedinMonitorNode,
  soraVideoNode,
  seoKeywordResearchNode,
  seoAuditNode,
  searchContactsNode,
  discordSendMessageNode,
  discordSendWebhookNode,
  discordCreateThreadNode,
  // AI
  socialKeywordGeneratorNode,
  draftEmailsNode,
  socialAiAnalyzeNode,
];
