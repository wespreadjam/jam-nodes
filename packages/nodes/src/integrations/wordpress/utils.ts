/**
 * Resolve WordPress credentials and return computed baseUrl and authHeader.
 * Returns error if credentials are missing.
 */
export function resolveWordPressAuth(creds: {
  siteUrl?: string
  username?: string
  applicationPassword?: string
} | undefined): { baseUrl: string; authHeader: string } | { error: string } {
  if (!creds?.siteUrl || !creds?.username || !creds?.applicationPassword) {
    return {
      error:
        'WordPress credentials not configured. Please provide context.credentials.wordpress with siteUrl, username, and applicationPassword.',
    }
  }

  const baseUrl = creds.siteUrl.replace(/\/+$/, '')
  const authHeader = `Basic ${Buffer.from(`${creds.username}:${creds.applicationPassword}`).toString('base64')}`

  return { baseUrl, authHeader }
}
