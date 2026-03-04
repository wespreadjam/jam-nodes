import { z } from 'zod'
import { defineNode } from '@jam-nodes/core'

/**
 * Input schema for webhook trigger node
 */
export const WebhookTriggerInputSchema = z.object({
  path: z.string().min(1).regex(/^\//, 'Path must start with /'),
  method: z.enum(['GET', 'POST', 'PUT']),
  authentication: z
    .object({
      type: z.enum(['none', 'basic', 'header']),
      credentials: z.record(z.string()).optional(),
    })
    .optional(),
  responseCode: z.number().int().min(100).max(599).default(200).optional(),
  responseData: z.unknown().optional(),
})

export type WebhookTriggerInput = z.infer<typeof WebhookTriggerInputSchema>

/**
 * Output schema for webhook trigger node
 */
export const WebhookTriggerOutputSchema = z.object({
  body: z.unknown(),
  headers: z.record(z.string()),
  method: z.string(),
  path: z.string(),
  query: z.record(z.string()),
  timestamp: z.string(),
  authenticated: z.boolean(),
})

export type WebhookTriggerOutput = z.infer<typeof WebhookTriggerOutputSchema>

/**
 * Webhook trigger node.
 *
 * A configuration + validation node that processes incoming HTTP webhook payloads.
 * The host application is responsible for registering the route and injecting
 * the incoming request data into context.variables.webhookRequest before executing.
 *
 * Supports three authentication types:
 * - none: No auth check
 * - basic: HTTP Basic Auth via Authorization header
 * - header: Custom header key/value validation
 *
 * @example
 * ```typescript
 * {
 *   path: '/webhooks/stripe',
 *   method: 'POST',
 *   authentication: {
 *     type: 'header',
 *     credentials: { 'x-stripe-signature': 'expected-secret' }
 *   }
 * }
 * ```
 */
export const webhookTriggerNode = defineNode({
  type: 'webhook_trigger',
  name: 'Webhook Trigger',
  description: 'Receive incoming HTTP webhook payloads with configurable authentication',
  category: 'logic',
  inputSchema: WebhookTriggerInputSchema,
  outputSchema: WebhookTriggerOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: false,
    supportsCancel: false,
  },
  executor: async (input, context) => {
    try {
      // Step 1 — Read incoming request from context
      const webhookRequest = context.resolveNestedPath('webhookRequest') as
        | {
            method?: string
            headers?: Record<string, string>
            body?: unknown
            path?: string
            query?: Record<string, string>
          }
        | undefined

      if (!webhookRequest) {
        return {
          success: false,
          error:
            'No webhook request data found in context. Ensure the host application injects webhookRequest into context.variables before executing this node.',
        }
      }

      // Step 2 — Validate method
      if (webhookRequest.method?.toUpperCase() !== input.method) {
        return {
          success: false,
          error: `Method mismatch: expected ${input.method}, received ${webhookRequest.method}`,
        }
      }

      // Step 3 — Authentication
      let authenticated = false
      const authType = input.authentication?.type ?? 'none'

      if (authType === 'none') {
        authenticated = true
      } else if (authType === 'basic') {
        const authHeader = webhookRequest.headers?.['authorization']
        if (!authHeader) {
          return {
            success: false,
            error: 'Basic authentication failed: invalid credentials',
          }
        }

        if (!authHeader.startsWith('Basic ')) {
          return {
            success: false,
            error: 'Basic authentication failed: invalid credentials',
          }
        }

        const base64 = authHeader.slice(6)
        const decoded = Buffer.from(base64, 'base64').toString('utf-8')
        const colonIndex = decoded.indexOf(':')
        if (colonIndex === -1) {
          return {
            success: false,
            error: 'Basic authentication failed: invalid credentials',
          }
        }

        const username = decoded.slice(0, colonIndex)
        const password = decoded.slice(colonIndex + 1)
        const expectedUsername = input.authentication?.credentials?.['username']
        const expectedPassword = input.authentication?.credentials?.['password']

        if (username !== expectedUsername || password !== expectedPassword) {
          return {
            success: false,
            error: 'Basic authentication failed: invalid credentials',
          }
        }

        authenticated = true
      } else if (authType === 'header') {
        const credentials = input.authentication?.credentials ?? {}
        for (const [key, expectedValue] of Object.entries(credentials)) {
          const actualValue = webhookRequest.headers?.[key.toLowerCase()]
          if (actualValue !== expectedValue) {
            return {
              success: false,
              error: 'Header authentication failed: missing or invalid header',
            }
          }
        }
        authenticated = true
      }

      // Step 4 — Return success
      return {
        success: true,
        output: {
          body: webhookRequest.body ?? null,
          headers: webhookRequest.headers ?? {},
          method: webhookRequest.method!,
          path: webhookRequest.path ?? input.path,
          query: webhookRequest.query ?? {},
          timestamp: new Date().toISOString(),
          authenticated,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
