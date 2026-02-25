# Contributing to jam-nodes

Thank you for your interest in contributing to jam-nodes! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Adding a New Node](#adding-a-new-node)
- [Adding a New Credential](#adding-a-new-credential)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Style](#code-style)

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone the repository
git clone https://github.com/anthropics/jam-nodes.git
cd jam-nodes

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

---

## Project Structure

```
jam-nodes/
├── packages/
│   ├── core/                    # Core framework
│   │   └── src/
│   │       ├── types/           # TypeScript types
│   │       │   ├── node.ts      # Node types
│   │       │   ├── credentials.ts # Credential types
│   │       │   └── services.ts  # Service interfaces
│   │       ├── execution/       # Execution context
│   │       ├── registry/        # Node registry
│   │       └── utils/           # Utilities (defineNode, etc.)
│   │
│   └── nodes/                   # Built-in nodes
│       └── src/
│           ├── logic/           # Logic nodes (conditional, delay, etc.)
│           ├── transform/       # Transform nodes (map, filter, etc.)
│           ├── integrations/    # Integration nodes
│           │   ├── apollo/
│           │   ├── hunter/      # <- You might add this!
│           │   └── ...
│           ├── ai/              # AI-powered nodes
│           └── examples/        # Example nodes
│
├── GITHUB_ISSUES.md             # Detailed specs for planned nodes
└── CONTRIBUTING.md              # This file
```

---

## Adding a New Node

### Step 1: Choose a Node to Implement

Check [GITHUB_ISSUES.md](./GITHUB_ISSUES.md) for detailed specs on planned nodes. Each issue includes:
- Input/output schemas
- Credential requirements
- API documentation links
- Acceptance criteria

### Step 2: Create the Node Files

Create a new directory for your integration:

```
packages/nodes/src/integrations/hunter/
├── index.ts              # Exports
├── domainSearch.ts       # hunterDomainSearch node
├── emailFinder.ts        # hunterEmailFinder node
├── emailVerifier.ts      # hunterEmailVerifier node
├── types.ts              # TypeScript types
├── schemas.ts            # Zod schemas
└── __tests__/
    └── hunter.test.ts    # Tests
```

### Step 3: Define Schemas

Use Zod to define your input and output schemas:

```typescript
// schemas.ts
import { z } from 'zod';

export const HunterDomainSearchInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  limit: z.number().min(1).max(100).default(10),
  type: z.enum(['personal', 'generic']).optional(),
  seniority: z.array(z.enum(['junior', 'senior', 'executive'])).optional(),
  department: z.array(z.enum(['sales', 'marketing', 'hr', 'it', 'finance', 'executive'])).optional(),
});

export const HunterEmailSchema = z.object({
  value: z.string().email(),
  type: z.string(),
  confidence: z.number(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  sources: z.array(z.object({
    domain: z.string(),
    uri: z.string(),
  })),
});

export const HunterDomainSearchOutputSchema = z.object({
  emails: z.array(HunterEmailSchema),
  meta: z.object({
    results: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});
```

### Step 4: Define Types

Export TypeScript types from your schemas:

```typescript
// types.ts
import type { z } from 'zod';
import type {
  HunterDomainSearchInputSchema,
  HunterDomainSearchOutputSchema,
  HunterEmailSchema,
} from './schemas';

export type HunterDomainSearchInput = z.infer<typeof HunterDomainSearchInputSchema>;
export type HunterDomainSearchOutput = z.infer<typeof HunterDomainSearchOutputSchema>;
export type HunterEmail = z.infer<typeof HunterEmailSchema>;
```

### Step 5: Implement the Node

Use `defineNode` from `@jam-nodes/core`:

```typescript
// domainSearch.ts
import { defineNode } from '@jam-nodes/core';
import { HunterDomainSearchInputSchema, HunterDomainSearchOutputSchema } from './schemas';
import type { HunterDomainSearchInput, HunterDomainSearchOutput } from './types';

export const hunterDomainSearchNode = defineNode({
  type: 'hunterDomainSearch',
  name: 'Hunter Domain Search',
  description: 'Find all email addresses associated with a domain',
  category: 'integration',

  inputSchema: HunterDomainSearchInputSchema,
  outputSchema: HunterDomainSearchOutputSchema,

  async executor(input: HunterDomainSearchInput, context): Promise<{
    success: boolean;
    output?: HunterDomainSearchOutput;
    error?: string;
  }> {
    try {
      // Get credentials from injected services
      const hunter = context.services?.hunter;
      if (!hunter?.apiKey) {
        return { success: false, error: 'Hunter API credentials not configured' };
      }

      // Build query parameters
      const params = new URLSearchParams({
        domain: input.domain,
        api_key: hunter.apiKey,
        limit: String(input.limit ?? 10),
      });

      if (input.type) params.set('type', input.type);
      if (input.seniority) params.set('seniority', input.seniority.join(','));
      if (input.department) params.set('department', input.department.join(','));

      // Make API request
      const response = await fetch(
        `https://api.hunter.io/v2/domain-search?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.errors?.[0]?.details || 'API request failed' };
      }

      const data = await response.json();

      return {
        success: true,
        output: {
          emails: data.data.emails,
          meta: data.meta,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
```

### Step 6: Export the Node

Add exports to your index file:

```typescript
// index.ts
export { hunterDomainSearchNode } from './domainSearch';
export { hunterEmailFinderNode } from './emailFinder';
export { hunterEmailVerifierNode } from './emailVerifier';

export * from './schemas';
export * from './types';
```

Then add to the main integrations index:

```typescript
// packages/nodes/src/integrations/index.ts
export * from './hunter/index.js';
```

And the main nodes index:

```typescript
// packages/nodes/src/index.ts
import { hunterDomainSearchNode, ... } from './integrations/index.js';

export const builtInNodes = [
  // ... existing nodes
  hunterDomainSearchNode,
  // ...
];
```

### Step 7: Write Tests

```typescript
// __tests__/hunter.test.ts
import { describe, it, expect } from 'vitest';
import { hunterDomainSearchNode } from '../domainSearch';

describe('hunterDomainSearchNode', () => {
  it('should have correct metadata', () => {
    expect(hunterDomainSearchNode.type).toBe('hunterDomainSearch');
    expect(hunterDomainSearchNode.category).toBe('integration');
  });

  it('should validate input schema', () => {
    const validInput = { domain: 'example.com' };
    const result = hunterDomainSearchNode.inputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid input', () => {
    const invalidInput = { domain: '' };
    const result = hunterDomainSearchNode.inputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});
```

---

## Adding a New Credential

### Step 1: Define the Credential

Create a credential definition in `packages/core/src/credentials/`:

```typescript
// packages/core/src/credentials/hunter.ts
import { z } from 'zod';
import { defineApiKeyCredential } from '../types/credentials';

export const HunterCredential = defineApiKeyCredential({
  name: 'hunter',
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
  testRequest: {
    url: 'https://api.hunter.io/v2/account',
    method: 'GET',
  },
});
```

### Credential Types

| Type | Use Case | Example |
|------|----------|---------|
| `apiKey` | Simple API key auth | Hunter, DataForSEO, SendGrid |
| `oauth2` | OAuth 2.0 flow | HubSpot, Google, Slack |
| `oauth2_pkce` | OAuth 2.0 with PKCE | Twitter/X |
| `bearer` | Bearer token | Airtable, Notion |
| `basic` | Username/password | WordPress |

### OAuth2 Example

```typescript
import { z } from 'zod';
import { defineOAuth2Credential } from '../types/credentials';

export const HubSpotCredential = defineOAuth2Credential({
  name: 'hubspot',
  displayName: 'HubSpot OAuth2',
  documentationUrl: 'https://developers.hubspot.com/docs/api/oauth-quickstart-guide',
  config: {
    authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
    ],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
  }),
});
```

---

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a specific package
pnpm --filter @jam-nodes/nodes test

# Run tests for a specific file
pnpm test hunter
```

---

## Submitting a Pull Request

### Before Submitting

1. **Run tests:** `pnpm test`
2. **Run linting:** `pnpm lint`
3. **Build packages:** `pnpm build`
4. **Update exports:** Ensure new nodes are exported from index files

### PR Checklist

- [ ] Node has Zod schemas for input/output
- [ ] TypeScript types are exported
- [ ] Credential definition included (if needed)
- [ ] Unit tests pass
- [ ] Error handling implemented
- [ ] Documentation/comments added
- [ ] Exports added to index files

### Commit Message Format

```
feat(nodes): add Hunter.io email finder integration

- Add hunterDomainSearch, hunterEmailFinder, hunterEmailVerifier nodes
- Add Hunter credential definition
- Add tests for all operations
```

---

## Code Style

- Use TypeScript strict mode
- Use Zod for all runtime validation
- Export types separately from schemas
- Use `async/await` over raw Promises
- Handle errors gracefully with meaningful messages
- Follow existing patterns in the codebase

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Node variable | camelCase + `Node` | `hunterDomainSearchNode` |
| Node type | camelCase | `hunterDomainSearch` |
| Schema | PascalCase + `Schema` | `HunterDomainSearchInputSchema` |
| Type | PascalCase | `HunterDomainSearchInput` |
| Credential | PascalCase + `Credential` | `HunterCredential` |

---

## Questions?

- Check [GITHUB_ISSUES.md](./GITHUB_ISSUES.md) for detailed specs
- Open an issue for discussion
- Join our Discord community (coming soon)

Thank you for contributing!
