import Conf from 'conf';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Encrypted credential store using conf
 * Stores credentials in ~/.config/jam-nodes-playground/
 */
const store = new Conf<{
  credentials: Record<string, Record<string, string>>;
}>({
  projectName: 'jam-nodes-playground',
  defaults: {
    credentials: {},
  },
});

/**
 * Load environment variables from .env files
 * Searches in current directory and parent directories
 */
function loadEnvFiles(): void {
  // Load .env from current working directory
  config();

  // Also try .env.local
  const localEnvPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(localEnvPath)) {
    config({ path: localEnvPath });
  }
}

// Load env files on import
loadEnvFiles();

/**
 * Known credential name to environment variable mappings
 */
const ENV_VAR_MAPPINGS: Record<string, string[]> = {
  hunter: ['JAM_HUNTER_API_KEY', 'HUNTER_API_KEY'],
  apollo: ['JAM_APOLLO_API_KEY', 'APOLLO_API_KEY'],
  sendgrid: ['JAM_SENDGRID_API_KEY', 'SENDGRID_API_KEY'],
  openai: ['JAM_OPENAI_API_KEY', 'OPENAI_API_KEY'],
  anthropic: ['JAM_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
  twitter: ['JAM_TWITTER_BEARER_TOKEN', 'TWITTER_BEARER_TOKEN'],
  reddit: ['JAM_REDDIT_CLIENT_ID', 'REDDIT_CLIENT_ID'],
  linkedin: ['JAM_LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ACCESS_TOKEN'],
  dataforseo: ['JAM_DATAFORSEO_LOGIN', 'DATAFORSEO_LOGIN'],
  hubspot: ['JAM_HUBSPOT_API_KEY', 'HUBSPOT_API_KEY'],
  clearbit: ['JAM_CLEARBIT_API_KEY', 'CLEARBIT_API_KEY'],
  dropcontact: ['JAM_DROPCONTACT_API_KEY', 'DROPCONTACT_API_KEY'],
  discordbot: ['JAM_DISCORD_BOT_TOKEN', 'DISCORD_BOT_TOKEN'],
  discordwebhook: ['JAM_DISCORD_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL'],
};

/**
 * Check environment variables for credentials
 */
function getFromEnv(name: string): Record<string, string> | null {
  const envVars = ENV_VAR_MAPPINGS[name.toLowerCase()];

  if (envVars) {
    for (const varName of envVars) {
      const value = process.env[varName];
      if (value) {
        if (name.toLowerCase() === 'discordbot') {
          return { botToken: value };
        }
        if (name.toLowerCase() === 'discordwebhook') {
          return { webhookUrl: value };
        }
        return { apiKey: value };
      }
    }
  }

  // Try generic pattern: JAM_{NAME}_API_KEY
  const genericKey = `JAM_${name.toUpperCase()}_API_KEY`;
  if (process.env[genericKey]) {
    return { apiKey: process.env[genericKey] };
  }

  // Special handling for services with multiple env vars
  if (name.toLowerCase() === 'dataforseo') {
    const login = process.env['JAM_DATAFORSEO_LOGIN'] || process.env['DATAFORSEO_LOGIN'];
    const password = process.env['JAM_DATAFORSEO_PASSWORD'] || process.env['DATAFORSEO_PASSWORD'];
    if (login && password) {
      return { login, password };
    }
  }

  if (name.toLowerCase() === 'reddit') {
    const clientId = process.env['JAM_REDDIT_CLIENT_ID'] || process.env['REDDIT_CLIENT_ID'];
    const clientSecret = process.env['JAM_REDDIT_CLIENT_SECRET'] || process.env['REDDIT_CLIENT_SECRET'];
    if (clientId && clientSecret) {
      return { clientId, clientSecret };
    }
  }

  return null;
}

/**
 * Get credentials for a service.
 * Checks in order:
 * 1. Environment variables
 * 2. Saved credentials in config store
 * 3. Returns null (caller should prompt user)
 *
 * @param name - Service name (e.g., 'hunter', 'apollo')
 * @returns Credentials object or null if not found
 */
export async function getCredentials(
  name: string
): Promise<Record<string, string> | null> {
  // 1. Check environment variables
  const envCreds = getFromEnv(name);
  if (envCreds) {
    return envCreds;
  }

  // 2. Check saved credentials
  const saved = store.get(`credentials.${name.toLowerCase()}`) as Record<string, string> | undefined;
  if (saved && Object.keys(saved).length > 0) {
    return saved;
  }

  // 3. Return null (caller should prompt)
  return null;
}

/**
 * Save credentials for a service.
 *
 * @param name - Service name
 * @param credentials - Credential data to save
 */
export function saveCredentials(
  name: string,
  credentials: Record<string, string>
): void {
  store.set(`credentials.${name.toLowerCase()}`, credentials);
}

/**
 * Delete credentials for a service.
 *
 * @param name - Service name
 * @returns True if credentials were deleted
 */
export function deleteCredentials(name: string): boolean {
  const key = `credentials.${name.toLowerCase()}`;
  if (store.has(key)) {
    store.delete(key);
    return true;
  }
  return false;
}

/**
 * List all saved credential names.
 *
 * @returns Array of service names with saved credentials
 */
export function listSavedCredentials(): string[] {
  const credentials = store.get('credentials');
  return Object.keys(credentials);
}

/**
 * Check if credentials exist for a service.
 *
 * @param name - Service name
 * @returns True if credentials are available (env or saved)
 */
export async function hasCredentials(name: string): Promise<boolean> {
  const creds = await getCredentials(name);
  return creds !== null;
}

/**
 * Get credential source for display.
 *
 * @param name - Service name
 * @returns Source description or null
 */
export async function getCredentialSource(
  name: string
): Promise<'env' | 'saved' | null> {
  const envCreds = getFromEnv(name);
  if (envCreds) {
    return 'env';
  }

  const saved = store.get(`credentials.${name.toLowerCase()}`) as Record<string, string> | undefined;
  if (saved && Object.keys(saved).length > 0) {
    return 'saved';
  }

  return null;
}

/**
 * Clear all saved credentials.
 */
export function clearAllCredentials(): void {
  store.set('credentials', {});
}

/**
 * Get the path to the credential store.
 */
export function getStorePath(): string {
  return store.path;
}
