import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { createRegistry, type NodeExecutionContext, type NodeCredentials } from '@jam-nodes/core';

// Load environment variables from .env file
dotenv.config();
import { builtInNodes } from '@jam-nodes/nodes';
import {
  getCredentials,
  saveCredentials,
  getCredentialSource,
} from '../credentials/index.js';
import {
  promptForNodeInput,
  promptForCredentials,
  promptSaveCredentials,
  selectNode,
} from '../ui/index.js';
import { generateMockOutput } from '../utils/index.js';

// Create and populate the registry
const registry = createRegistry();
for (const node of builtInNodes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry.register(node as any);
}

/**
 * Credential requirements for each node type
 */
const NODE_CREDENTIAL_REQUIREMENTS: Record<string, { service: string; fields: { name: string; envVar: string }[] }[]> = {
  search_contacts: [{ service: 'apollo', fields: [{ name: 'apiKey', envVar: 'APOLLO_API_KEY' }] }],
  reddit_monitor: [], // No credentials required - uses public API
  twitter_monitor: [{ service: 'twitter', fields: [{ name: 'twitterApiIoKey', envVar: 'TWITTERAPI_IO_KEY' }] }],
  linkedin_monitor: [{ service: 'forumScout', fields: [{ name: 'apiKey', envVar: 'FORUMSCOUT_API_KEY' }] }],
  sora_video: [{ service: 'openai', fields: [{ name: 'apiKey', envVar: 'OPENAI_API_KEY' }] }],
  seo_keyword_research: [{ service: 'dataForSeo', fields: [{ name: 'apiToken', envVar: 'DATAFORSEO_API_TOKEN' }] }],
  seo_audit: [{ service: 'dataForSeo', fields: [{ name: 'apiToken', envVar: 'DATAFORSEO_API_TOKEN' }] }],
  social_keyword_generator: [{ service: 'anthropic', fields: [{ name: 'apiKey', envVar: 'ANTHROPIC_API_KEY' }] }],
  draft_emails: [{ service: 'anthropic', fields: [{ name: 'apiKey', envVar: 'ANTHROPIC_API_KEY' }] }],
  social_ai_analyze: [{ service: 'anthropic', fields: [{ name: 'apiKey', envVar: 'ANTHROPIC_API_KEY' }] }],
  discord_send_message: [{ service: 'discordBot', fields: [{ name: 'botToken', envVar: 'DISCORD_BOT_TOKEN' }] }],
  discord_send_webhook: [{ service: 'discordWebhook', fields: [{ name: 'webhookUrl', envVar: 'DISCORD_WEBHOOK_URL' }] }],
  discord_create_thread: [{ service: 'discordBot', fields: [{ name: 'botToken', envVar: 'DISCORD_BOT_TOKEN' }] }],
};

/**
 * Run command - executes a node with input
 */
export const runCommand = new Command('run')
  .description('Run a jam-node interactively')
  .argument('[node-type]', 'Node type to run (interactive selection if omitted)')
  .option('-i, --input <json>', 'Input as JSON string')
  .option('-m, --mock', 'Use mock mode (returns sample data without calling APIs)')
  .option('--no-confirm', 'Skip confirmation prompt')
  .action(async (nodeType: string | undefined, options) => {
    try {
      // If no node type specified, show selection
      if (!nodeType) {
        const nodes = registry.getAllMetadata();
        nodeType = await selectNode(nodes);
      }

      // Get node definition
      const definition = registry.getDefinition(nodeType);
      if (!definition) {
        console.error(chalk.red(`Unknown node type: ${nodeType}`));
        console.log(chalk.dim('Use "jam list" to see available nodes'));
        process.exit(1);
      }

      // Display node info
      console.log();
      console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────────┐'));
      console.log(chalk.bold.cyan('│  ') + chalk.bold(definition.name).padEnd(57) + chalk.bold.cyan('│'));
      console.log(chalk.bold.cyan('│  ') + chalk.dim(definition.description.slice(0, 55)).padEnd(57) + chalk.bold.cyan('│'));
      console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────────┘'));

      // Mock mode notice
      if (options.mock) {
        console.log();
        console.log(chalk.yellow('⚡ Mock mode enabled - returning sample data without API calls'));
      }

      // Check for required credentials
      const credentialRequirements = NODE_CREDENTIAL_REQUIREMENTS[nodeType] || [];
      const nodeCredentials: NodeCredentials = {};

      if (credentialRequirements.length > 0 && !options.mock) {
        console.log();
        const serviceNames = credentialRequirements.map(r => r.service).join(', ');
        console.log(chalk.dim(`This node requires: ${serviceNames}`));

        for (const requirement of credentialRequirements) {
          const { service, fields } = requirement;
          const source = await getCredentialSource(service);

          if (source) {
            console.log(chalk.green(`✓ ${service} credentials found (${source})`));
            const creds = await getCredentials(service);
            if (creds) {
              // Map stored credentials to NodeCredentials format
              (nodeCredentials as Record<string, Record<string, string>>)[service] = creds;
            }
          } else {
            // Check environment variables first
            let foundInEnv = true;
            const envCreds: Record<string, string> = {};

            for (const field of fields) {
              const envValue = process.env[field.envVar];
              if (envValue) {
                envCreds[field.name] = envValue;
                console.log(chalk.green(`✓ ${service}.${field.name} found in env (${field.envVar})`));
              } else {
                foundInEnv = false;
              }
            }

            if (foundInEnv) {
              (nodeCredentials as Record<string, Record<string, string>>)[service] = envCreds;
            } else {
              console.log(chalk.yellow(`⚠ ${service} credentials not found`));

              // Prompt for credentials
              const promptFields = fields.map(f => ({
                name: f.name,
                message: `${service} ${f.name} (or set ${f.envVar}):`,
                type: 'password' as const,
              }));
              const creds = await promptForCredentials(service, promptFields);

              (nodeCredentials as Record<string, Record<string, string>>)[service] = creds;

              // Ask if they want to save
              const shouldSave = await promptSaveCredentials();
              if (shouldSave) {
                saveCredentials(service, creds);
                console.log(chalk.green(`✓ ${service} credentials saved`));
              }
            }
          }
        }
      }

      // Get input
      let input: Record<string, unknown>;

      if (options.input) {
        try {
          input = JSON.parse(options.input);
        } catch {
          console.error(chalk.red('Invalid JSON input'));
          process.exit(1);
        }
      } else {
        // Interactive input
        input = await promptForNodeInput(definition.inputSchema);
      }

      // Display input summary
      console.log();
      console.log(chalk.dim('Input:'));
      console.log(chalk.dim(JSON.stringify(input, null, 2)));

      // Execute node
      const spinner = ora({
        text: `Executing ${definition.name}...`,
        color: 'cyan',
      }).start();

      try {
        let result;

        if (options.mock) {
          // Mock mode - generate sample output
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
          result = {
            success: true,
            output: generateMockOutput(nodeType, definition.outputSchema),
          };
        } else {
          // Create execution context with credentials (not services)
          const context: NodeExecutionContext = {
            userId: 'playground',
            workflowExecutionId: `playground_${Date.now()}`,
            variables: {},
            resolveNestedPath: (path: string) => {
              // Simple implementation - look in variables
              const parts = path.split('.');
              let current: unknown = context.variables;
              for (const part of parts) {
                if (current && typeof current === 'object') {
                  current = (current as Record<string, unknown>)[part];
                } else {
                  return undefined;
                }
              }
              return current;
            },
            credentials: nodeCredentials,
          };

          // Validate input
          const validatedInput = definition.inputSchema.parse(input);

          // Execute
          result = await definition.executor(validatedInput, context);
        }

        spinner.stop();

        // Display result
        console.log();
        if (result.success) {
          console.log(chalk.green.bold('✓ Success!'));
          console.log();
          console.log(chalk.dim('Output:'));
          console.log(formatJson(result.output));
        } else {
          console.log(chalk.red.bold('✗ Failed'));
          console.log(chalk.red(result.error || 'Unknown error'));
        }
      } catch (error) {
        spinner.stop();
        console.log();
        console.log(chalk.red.bold('✗ Execution failed'));
        console.log(chalk.red(error instanceof Error ? error.message : 'Unknown error'));

        if (error instanceof Error && error.stack) {
          console.log(chalk.dim(error.stack));
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Format JSON with syntax highlighting
 */
function formatJson(data: unknown): string {
  const json = JSON.stringify(data, null, 2);
  return json
    .replace(/"([^"]+)":/g, chalk.cyan('"$1":'))
    .replace(/: "([^"]+)"/g, ': ' + chalk.green('"$1"'))
    .replace(/: (\d+)/g, ': ' + chalk.yellow('$1'))
    .replace(/: (true|false)/g, ': ' + chalk.magenta('$1'))
    .replace(/: (null)/g, ': ' + chalk.dim('$1'));
}

