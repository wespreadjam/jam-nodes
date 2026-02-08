import { defineNode } from '@jam-nodes/core';
import {
  DraftEmailsInputSchema,
  DraftEmailsOutputSchema,
  type DraftEmailsOutput,
  type DraftEmailInfo,
} from '../schemas/ai';
import {
  buildEmailPrompt,
  buildSubjectPrompt,
  cleanEmailBody,
  cleanSubjectLine,
} from '../prompts/draft-emails';

// Re-export schemas for convenience
export {
  DraftEmailsInputSchema,
  DraftEmailsOutputSchema,
  DraftEmailInfoSchema,
  ContactSchema,
  type DraftEmailsInput,
  type DraftEmailsOutput,
  type DraftEmailInfo,
  type Contact,
} from '../schemas/ai';

/**
 * Draft Emails Node
 *
 * Uses Claude to generate personalized email drafts for each contact.
 * Requires `context.services.anthropic` for AI generation and
 * `context.services.emailDrafts` for storing drafts.
 *
 * @example
 * ```typescript
 * const result = await draftEmailsNode.executor({
 *   contacts: [{ id: '1', name: 'John', email: 'john@acme.com', title: 'CTO', company: 'Acme' }],
 *   productDescription: 'AI-powered SEO tool'
 * }, context);
 * ```
 */
export const draftEmailsNode = defineNode({
  type: 'draft_emails',
  name: 'Draft Emails',
  description: 'Generate personalized email drafts for contacts using AI',
  category: 'action',
  inputSchema: DraftEmailsInputSchema,
  outputSchema: DraftEmailsOutputSchema,
  estimatedDuration: 30,
  capabilities: {
    supportsRerun: true,
    supportsBulkActions: true,
  },

  executor: async (input, context) => {
    try {
      // Require Anthropic service
      if (!context.services?.anthropic) {
        return {
          success: false,
          error: 'Anthropic service not configured. Please provide context.services.anthropic.',
        };
      }

      // Require email drafts service
      if (!context.services?.emailDrafts) {
        return {
          success: false,
          error: 'Email drafts service not configured. Please provide context.services.emailDrafts.',
        };
      }

      if (!context.campaignId) {
        return {
          success: false,
          error: 'Campaign ID is required in execution context',
        };
      }

      // Get sender name from workflow variables
      const senderName = context.variables['senderName'] as string | undefined;
      if (!senderName) {
        return {
          success: false,
          error: 'Please set your name in settings before creating email campaigns.',
        };
      }

      const emails: DraftEmailInfo[] = [];

      // Generate and save drafts for each contact
      for (const contact of input.contacts) {
        if (!contact.email) {
          continue;
        }

        try {
          // Generate personalized email body using prompt helper
          const emailPrompt = buildEmailPrompt(
            contact,
            input.productDescription,
            senderName,
            input.emailTemplate
          );

          const rawBody = await context.services.anthropic.generateText({
            prompt: emailPrompt,
            model: 'claude-sonnet-4-20250514',
            maxTokens: 250,
          });

          // Clean up the email body
          const emailBody = cleanEmailBody(rawBody);

          // Generate subject line
          const subjectPrompt = buildSubjectPrompt(contact, emailBody);
          const rawSubject = await context.services.anthropic.generateText({
            prompt: subjectPrompt,
            model: 'claude-sonnet-4-20250514',
            maxTokens: 50,
          });

          // Clean up subject
          const emailSubject = cleanSubjectLine(rawSubject);

          // Save to database via service
          const savedEmail = await context.services.emailDrafts.createDraft({
            campaignId: context.campaignId,
            userId: context.userId,
            toEmail: contact.email,
            toName: contact.name,
            toCompany: contact.company ?? undefined,
            toTitle: contact.title ?? undefined,
            subject: emailSubject,
            body: emailBody,
            contactId: contact.id,
          });

          emails.push({
            id: savedEmail.id,
            toEmail: savedEmail.toEmail,
            toName: savedEmail.toName || '',
            toCompany: savedEmail.toCompany || '',
            toTitle: savedEmail.toTitle || '',
            subject: savedEmail.subject,
            body: savedEmail.body,
            status: savedEmail.status,
          });

          // Small delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch {
          // Continue with other contacts even if one fails
        }
      }

      const output: DraftEmailsOutput = {
        emails,
        draftedCount: emails.length,
      };

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to draft emails',
      };
    }
  },
});
