import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getCredentials,
  saveCredentials,
  deleteCredentials,
  listSavedCredentials,
  getCredentialSource,
  clearAllCredentials,
  getStorePath,
} from '../credentials/index.js';

/**
 * Known credential types and their required fields
 */
const CREDENTIAL_SCHEMAS: Record<
  string,
  Array<{ name: string; message: string; type?: 'input' | 'password' }>
> = {
  apollo: [{ name: 'apiKey', message: 'Apollo API Key:', type: 'password' }],
  hunter: [{ name: 'apiKey', message: 'Hunter API Key:', type: 'password' }],
  openai: [{ name: 'apiKey', message: 'OpenAI API Key:', type: 'password' }],
  anthropic: [{ name: 'apiKey', message: 'Anthropic API Key:', type: 'password' }],
  sendgrid: [{ name: 'apiKey', message: 'SendGrid API Key:', type: 'password' }],
  hubspot: [{ name: 'apiKey', message: 'HubSpot API Key:', type: 'password' }],
  clearbit: [{ name: 'apiKey', message: 'Clearbit API Key:', type: 'password' }],
  dropcontact: [{ name: 'apiKey', message: 'Dropcontact API Key:', type: 'password' }],
  twitter: [{ name: 'bearerToken', message: 'Twitter Bearer Token:', type: 'password' }],
  linkedin: [{ name: 'accessToken', message: 'LinkedIn Access Token:', type: 'password' }],
  reddit: [
    { name: 'clientId', message: 'Reddit Client ID:', type: 'input' },
    { name: 'clientSecret', message: 'Reddit Client Secret:', type: 'password' },
  ],
  dataforseo: [
    { name: 'login', message: 'DataForSEO Login:', type: 'input' },
    { name: 'password', message: 'DataForSEO Password:', type: 'password' },
  ],
  discordbot: [{ name: 'botToken', message: 'Discord Bot Token:', type: 'password' }],
  discordwebhook: [{ name: 'webhookUrl', message: 'Discord Webhook URL:', type: 'input' }],
};

/**
 * Credentials command - manage saved credentials
 */
export const credentialsCommand = new Command('credentials')
  .alias('creds')
  .description('Manage saved credentials');

/**
 * List saved credentials
 */
credentialsCommand
  .command('list')
  .description('List all saved credentials')
  .action(async () => {
    const saved = listSavedCredentials();

    console.log();
    console.log(chalk.bold('Saved Credentials'));
    console.log(chalk.dim(`Store: ${getStorePath()}`));
    console.log();

    if (saved.length === 0) {
      console.log(chalk.dim('No credentials saved yet.'));
      console.log(chalk.dim('Use "jam credentials set <service>" to add credentials.'));
      return;
    }

    for (const service of saved) {
      const source = await getCredentialSource(service);
      const icon = source === 'env' ? '🌍' : '💾';
      console.log(`  ${icon} ${chalk.bold(service)} ${chalk.dim(`(${source})`)}`);
    }

    console.log();
    console.log(chalk.dim('🌍 = from environment, 💾 = saved to config'));
  });

/**
 * Set credentials for a service
 */
credentialsCommand
  .command('set <service>')
  .description('Set credentials for a service')
  .action(async (service: string) => {
    const serviceLower = service.toLowerCase();

    // Get schema for this service
    const schema = CREDENTIAL_SCHEMAS[serviceLower];

    if (!schema) {
      console.log(chalk.yellow(`Unknown service: ${service}`));
      console.log(chalk.dim('Known services:'));
      console.log(chalk.dim(`  ${Object.keys(CREDENTIAL_SCHEMAS).join(', ')}`));
      console.log();

      // Allow custom single API key
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Would you like to set a custom API key for this service?',
          default: true,
        },
      ]);

      if (!proceed) return;

      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `${service} API Key:`,
          mask: '*',
        },
      ]);

      saveCredentials(serviceLower, { apiKey });
      console.log(chalk.green(`✓ ${service} credentials saved`));
      return;
    }

    // Check if already exists
    const existing = await getCredentials(serviceLower);
    if (existing) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Credentials for ${service} already exist. Overwrite?`,
          default: false,
        },
      ]);
      if (!overwrite) return;
    }

    // Prompt for credentials
    console.log();
    console.log(chalk.dim(`Enter credentials for ${service}:`));

    const answers = await inquirer.prompt(
      schema.map((field) => ({
        type: field.type || 'password',
        name: field.name,
        message: field.message,
        mask: '*',
      }))
    );

    saveCredentials(serviceLower, answers);
    console.log(chalk.green(`✓ ${service} credentials saved`));
  });

/**
 * Delete credentials for a service
 */
credentialsCommand
  .command('delete <service>')
  .alias('rm')
  .description('Delete credentials for a service')
  .action(async (service: string) => {
    const serviceLower = service.toLowerCase();

    // Check if exists
    const existing = await getCredentials(serviceLower);
    if (!existing) {
      console.log(chalk.yellow(`No credentials found for ${service}`));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Delete credentials for ${service}?`,
        default: false,
      },
    ]);

    if (!confirm) return;

    if (deleteCredentials(serviceLower)) {
      console.log(chalk.green(`✓ ${service} credentials deleted`));
    } else {
      console.log(chalk.yellow(`Could not delete ${service} credentials`));
    }
  });

/**
 * Check credentials for a service
 */
credentialsCommand
  .command('check <service>')
  .description('Check if credentials exist for a service')
  .action(async (service: string) => {
    const serviceLower = service.toLowerCase();
    const source = await getCredentialSource(serviceLower);

    if (source) {
      console.log(chalk.green(`✓ ${service} credentials found (${source})`));
    } else {
      console.log(chalk.red(`✗ ${service} credentials not found`));
    }
  });

/**
 * Clear all saved credentials
 */
credentialsCommand
  .command('clear')
  .description('Clear all saved credentials')
  .action(async () => {
    const saved = listSavedCredentials();

    if (saved.length === 0) {
      console.log(chalk.dim('No credentials to clear.'));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Delete all ${saved.length} saved credentials?`,
        default: false,
      },
    ]);

    if (!confirm) return;

    clearAllCredentials();
    console.log(chalk.green('✓ All credentials cleared'));
  });

/**
 * Show credential store path
 */
credentialsCommand
  .command('path')
  .description('Show the credential store path')
  .action(() => {
    console.log(getStorePath());
  });
