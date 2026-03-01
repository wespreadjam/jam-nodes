import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'jam-nodes-credentials';
const ENCRYPTION_KEY = 'jam-nodes-playground-v1';

export type CredentialData = Record<string, string>;
export type CredentialStore = Record<string, CredentialData>;

/**
 * Save credential for a service (encrypted in localStorage)
 */
export function saveCredential(service: string, data: CredentialData): void {
  if (typeof window === 'undefined') return;

  const stored = getAll();
  stored[service.toLowerCase()] = data;

  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(stored),
    ENCRYPTION_KEY
  ).toString();

  localStorage.setItem(STORAGE_KEY, encrypted);
}

/**
 * Get credential for a service
 */
export function getCredential(service: string): CredentialData | null {
  const stored = getAll();
  return stored[service.toLowerCase()] || null;
}

/**
 * Delete credential for a service
 */
export function deleteCredential(service: string): boolean {
  if (typeof window === 'undefined') return false;

  const stored = getAll();
  const key = service.toLowerCase();

  if (stored[key]) {
    delete stored[key];

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(stored),
      ENCRYPTION_KEY
    ).toString();

    localStorage.setItem(STORAGE_KEY, encrypted);
    return true;
  }

  return false;
}

/**
 * Get all stored credentials
 */
export function getAll(): CredentialStore {
  if (typeof window === 'undefined') return {};

  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return {};

  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!jsonStr) return {};
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}

/**
 * Get list of services with stored credentials
 */
export function listCredentials(): string[] {
  return Object.keys(getAll());
}

/**
 * Check if credential exists for a service
 */
export function hasCredential(service: string): boolean {
  return getCredential(service) !== null;
}

/**
 * Clear all stored credentials
 */
export function clearAll(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Known credential schemas for UI form generation
 */
export const CREDENTIAL_SCHEMAS: Record<
  string,
  Array<{ name: string; label: string; type: 'text' | 'password' }>
> = {
  apollo: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  hunter: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  openai: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  anthropic: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  sendgrid: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  hubspot: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  clearbit: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  dropcontact: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  twitter: [{ name: 'bearerToken', label: 'Bearer Token', type: 'password' }],
  linkedin: [{ name: 'accessToken', label: 'Access Token', type: 'password' }],
  reddit: [
    { name: 'clientId', label: 'Client ID', type: 'text' },
    { name: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  dataforseo: [
    { name: 'login', label: 'Login', type: 'text' },
    { name: 'password', label: 'Password', type: 'password' },
  ],
  forumscout: [{ name: 'apiKey', label: 'API Key', type: 'password' }],
  discordbot: [{ name: 'botToken', label: 'Bot Token', type: 'password' }],
  discordwebhook: [{ name: 'webhookUrl', label: 'Webhook URL', type: 'text' }],
};

/**
 * Get credential schema for a service
 */
export function getCredentialSchema(
  service: string
): (typeof CREDENTIAL_SCHEMAS)[string] | null {
  return CREDENTIAL_SCHEMAS[service.toLowerCase()] || null;
}
