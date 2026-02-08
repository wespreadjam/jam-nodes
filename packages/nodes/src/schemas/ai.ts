import { z } from 'zod';

// =============================================================================
// Social Keyword Generator
// =============================================================================

export const SocialKeywordGeneratorInputSchema = z.object({
  /** Natural language description of the topic to monitor */
  topic: z.string(),
  /** Optional user-specified keywords to include */
  userKeywords: z.array(z.string()).optional(),
});

export type SocialKeywordGeneratorInput = z.infer<typeof SocialKeywordGeneratorInputSchema>;

export const SocialKeywordGeneratorOutputSchema = z.object({
  topic: z.string(),
  twitter: z.object({
    keywords: z.array(z.string()),
    searchQuery: z.string(),
  }),
  reddit: z.object({
    keywords: z.array(z.string()),
  }),
  linkedin: z.object({
    keywords: z.array(z.string()),
    searchQueries: z.array(z.string()),
  }),
  allKeywords: z.array(z.string()),
});

export type SocialKeywordGeneratorOutput = z.infer<typeof SocialKeywordGeneratorOutputSchema>;

// =============================================================================
// Draft Emails
// =============================================================================

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
});

export type Contact = z.infer<typeof ContactSchema>;

export const DraftEmailsInputSchema = z.object({
  /** List of contacts to draft emails for */
  contacts: z.array(ContactSchema),
  /** Description of the product/service being offered */
  productDescription: z.string(),
  /** Optional email template to use */
  emailTemplate: z.string().optional(),
  /** Optional subject line (if not provided, AI generates one) */
  subject: z.string().optional(),
  /** Approval configuration */
  approval: z.object({
    required: z.boolean(),
    message: z.string().optional(),
  }).optional(),
});

export type DraftEmailsInput = z.infer<typeof DraftEmailsInputSchema>;

export const DraftEmailInfoSchema = z.object({
  id: z.string(),
  toEmail: z.string(),
  toName: z.string(),
  toCompany: z.string(),
  toTitle: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.string(),
});

export type DraftEmailInfo = z.infer<typeof DraftEmailInfoSchema>;

export const DraftEmailsOutputSchema = z.object({
  emails: z.array(DraftEmailInfoSchema),
  draftedCount: z.number(),
});

export type DraftEmailsOutput = z.infer<typeof DraftEmailsOutputSchema>;

// =============================================================================
// Social AI Analyze
// =============================================================================

export const SocialPostSchema = z.object({
  id: z.string(),
  platform: z.enum(['twitter', 'reddit', 'linkedin']),
  url: z.string(),
  text: z.string(),
  title: z.string().optional(),
  authorName: z.string(),
  authorHandle: z.string(),
  authorUrl: z.string(),
  authorFollowers: z.number().optional(),
  engagement: z.object({
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
    views: z.number().optional(),
  }),
  postedAt: z.string(),
});

export type SocialPost = z.infer<typeof SocialPostSchema>;

export const SocialAiAnalyzeInputSchema = z.object({
  /** Posts from Twitter monitor */
  twitterPosts: z.array(SocialPostSchema).optional(),
  /** Posts from Reddit monitor */
  redditPosts: z.array(SocialPostSchema).optional(),
  /** Posts from LinkedIn monitor */
  linkedinPosts: z.array(SocialPostSchema).optional(),
  /** Legacy field for backwards compatibility */
  posts: z.array(SocialPostSchema).optional(),
  /** Original topic for context */
  topic: z.string(),
  /** What the user is looking for */
  userIntent: z.string(),
  /** Optional monitoring config ID for storage */
  monitoringConfigId: z.string().optional(),
});

export type SocialAiAnalyzeInput = z.infer<typeof SocialAiAnalyzeInputSchema>;

export const AnalyzedPostSchema = SocialPostSchema.extend({
  relevanceScore: z.number(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  isComplaint: z.boolean(),
  urgencyLevel: z.enum(['low', 'medium', 'high']),
  aiSummary: z.string(),
  matchedKeywords: z.array(z.string()),
});

export type AnalyzedPost = z.infer<typeof AnalyzedPostSchema>;

export const SocialAiAnalyzeOutputSchema = z.object({
  analyzedPosts: z.array(AnalyzedPostSchema),
  highPriorityPosts: z.array(AnalyzedPostSchema),
  complaints: z.array(AnalyzedPostSchema),
  totalAnalyzed: z.number(),
  highPriorityCount: z.number(),
  complaintCount: z.number(),
  averageRelevance: z.number(),
});

export type SocialAiAnalyzeOutput = z.infer<typeof SocialAiAnalyzeOutputSchema>;
