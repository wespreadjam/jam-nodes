import type { z } from 'zod';

/**
 * Generate mock data from a Zod schema
 */
export function generateMockFromSchema(schema: z.ZodSchema): unknown {
  const def = schema._def;
  return generateFromDef(def);
}

function generateFromDef(def: z.ZodTypeDef & { typeName?: string }): unknown {
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'mock_string';

    case 'ZodNumber':
      return 42;

    case 'ZodBoolean':
      return true;

    case 'ZodNull':
      return null;

    case 'ZodUndefined':
      return undefined;

    case 'ZodLiteral':
      return (def as { value: unknown }).value;

    case 'ZodEnum':
      // Return first enum value
      return (def as { values: string[] }).values[0];

    case 'ZodNativeEnum':
      // Return first enum value
      const enumObj = (def as { values: Record<string, string | number> }).values;
      return Object.values(enumObj)[0];

    case 'ZodArray':
      // Generate 1-3 items
      const itemDef = (def as { type: { _def: z.ZodTypeDef } }).type._def;
      return [generateFromDef(itemDef), generateFromDef(itemDef)];

    case 'ZodObject':
      const shape = (def as { shape: () => Record<string, z.ZodTypeAny> }).shape();
      const result: Record<string, unknown> = {};
      for (const [key, fieldSchema] of Object.entries(shape)) {
        result[key] = generateFromDef(fieldSchema._def);
      }
      return result;

    case 'ZodUnion': {
      // Use first union option
      const options = (def as { options: z.ZodTypeAny[] }).options;
      const firstOpt = options?.[0];
      if (firstOpt) {
        return generateFromDef(firstOpt._def);
      }
      return null;
    }

    case 'ZodDiscriminatedUnion': {
      // Use first option
      const discOptions = (def as { options: Map<string, z.ZodTypeAny> }).options;
      const firstOption = Array.from(discOptions.values())[0];
      if (firstOption) {
        return generateFromDef(firstOption._def);
      }
      return null;
    }

    case 'ZodOptional':
    case 'ZodNullable':
      // Generate the inner type
      const innerType = (def as { innerType: z.ZodTypeAny }).innerType;
      return generateFromDef(innerType._def);

    case 'ZodDefault':
      // Use the default value
      return (def as { defaultValue: () => unknown }).defaultValue();

    case 'ZodRecord':
      // Generate a sample record
      const valueDef = (def as { valueType: z.ZodTypeAny }).valueType._def;
      return {
        key1: generateFromDef(valueDef),
        key2: generateFromDef(valueDef),
      };

    case 'ZodTuple':
      const items = (def as { items: z.ZodTypeAny[] }).items;
      return items.map((item) => generateFromDef(item._def));

    case 'ZodPromise':
      // Return the unwrapped type
      const promiseType = (def as { type: z.ZodTypeAny }).type;
      return generateFromDef(promiseType._def);

    case 'ZodEffects':
      // Return the inner type
      const effectsSchema = (def as { schema: z.ZodTypeAny }).schema;
      return generateFromDef(effectsSchema._def);

    case 'ZodUnknown':
    case 'ZodAny':
      return { mock: 'data' };

    default:
      return null;
  }
}

/**
 * Generate mock output for a specific node type
 * Provides more realistic mock data for known node types
 */
export function generateMockOutput(
  nodeType: string,
  outputSchema: z.ZodSchema
): unknown {
  // Custom mocks for known node types
  const customMocks: Record<string, unknown> = {
    conditional: {
      conditionMet: true,
      selectedBranch: 'true',
    },
    end: {
      completed: true,
      message: 'Workflow completed successfully',
    },
    delay: {
      waited: true,
      actualDurationMs: 1000,
      message: 'Waited for 1000ms',
    },
    map: {
      results: [
        { transformed: 'item1' },
        { transformed: 'item2' },
      ],
      count: 2,
    },
    filter: {
      results: [{ passes: true }],
      count: 1,
      originalCount: 3,
    },
    http_request: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: { message: 'Mock response' },
      ok: true,
      durationMs: 42,
    },
    search_contacts: {
      contacts: [
        {
          id: 'mock_contact_1',
          name: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          title: 'CTO',
          company: 'Example Corp',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          location: 'San Francisco, CA',
        },
        {
          id: 'mock_contact_2',
          name: 'Jane Smith',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          title: 'VP Engineering',
          company: 'Tech Startup',
          linkedinUrl: 'https://linkedin.com/in/janesmith',
          location: 'New York, NY',
        },
      ],
      totalFound: 2,
    },
    reddit_monitor: {
      posts: [
        {
          id: 'mock_post_1',
          platform: 'reddit',
          url: 'https://reddit.com/r/technology/mock',
          text: 'Mock Reddit post content',
          title: 'Mock Reddit Post',
          authorName: 'mock_user',
          authorHandle: 'u/mock_user',
          authorUrl: 'https://reddit.com/u/mock_user',
          subreddit: 'technology',
          engagement: {
            likes: 150,
            comments: 25,
            shares: 10,
          },
          createdAt: new Date().toISOString(),
        },
      ],
    },
    twitter_monitor: {
      posts: [
        {
          id: 'mock_tweet_1',
          platform: 'twitter',
          url: 'https://twitter.com/mockuser/status/mock_tweet_1',
          text: 'Mock tweet content',
          authorName: 'Mock User',
          authorHandle: '@mockuser',
          authorUrl: 'https://twitter.com/mockuser',
          authorFollowers: 1000,
          engagement: {
            likes: 50,
            comments: 5,
            shares: 10,
            views: 500,
          },
          createdAt: new Date().toISOString(),
        },
      ],
    },
    social_keyword_generator: {
      topic: 'AI automation',
      twitter: {
        keywords: ['ai', 'machine learning', 'automation'],
        searchQuery: 'ai OR "machine learning" OR automation',
      },
      reddit: {
        keywords: ['artificial intelligence', 'ML', 'workflow automation'],
      },
      linkedin: {
        keywords: ['AI', 'enterprise automation'],
        searchQueries: ['AI automation tools', 'machine learning workflow'],
      },
      allKeywords: ['ai', 'machine learning', 'automation', 'workflow'],
    },
    draft_emails: {
      emails: [
        {
          id: 'draft-mock-1',
          toEmail: 'john.doe@example.com',
          toName: 'John Doe',
          toCompany: 'Example Corp',
          toTitle: 'CTO',
          subject: 'Mock Email Subject',
          body: 'This is a mock email body for testing purposes.',
          status: 'draft',
        },
      ],
      draftedCount: 1,
    },
  };

  if (customMocks[nodeType]) {
    return customMocks[nodeType];
  }

  // Fall back to schema-based generation
  return generateMockFromSchema(outputSchema);
}
