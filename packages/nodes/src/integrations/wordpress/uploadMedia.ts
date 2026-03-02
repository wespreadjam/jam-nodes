import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import {
  WordPressUploadMediaInputSchema,
  WordPressUploadMediaOutputSchema,
  type WordPressUploadMediaInput,
} from './schemas.js'

interface WordPressApiMedia {
  id: number
  title: { rendered: string }
  slug: string
  status: string
  link: string
  source_url: string
  media_type: string
  mime_type: string
}

export const wordpressUploadMediaNode = defineNode({
  type: 'wordpress_upload_media',
  name: 'WordPress Upload Media',
  description: 'Upload a media file to the WordPress media library',
  category: 'integration',
  inputSchema: WordPressUploadMediaInputSchema,
  outputSchema: WordPressUploadMediaOutputSchema,
  estimatedDuration: 10,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: WordPressUploadMediaInput, context) => {
    try {
      const creds = context.credentials?.wordpress
      if (!creds?.siteUrl || !creds?.username || !creds?.applicationPassword) {
        return {
          success: false,
          error:
            'WordPress credentials not configured. Please provide context.credentials.wordpress with siteUrl, username, and applicationPassword.',
        }
      }

      const { siteUrl, username, applicationPassword } = creds
      const baseUrl = siteUrl.replace(/\/+$/, '')
      const authHeader = `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`

      const fileBuffer = Buffer.from(input.contentBase64, 'base64')
      const formData = new FormData()
      const blob = new Blob([fileBuffer], { type: input.mimeType })
      formData.append('file', blob, input.filename)

      const response = await fetchWithRetry(
        `${baseUrl}/wp-json/wp/v2/media`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Disposition': `attachment; filename="${input.filename}"`,
          },
          body: formData,
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 60000 },
      )

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `WordPress API error ${response.status}: ${errorText}`,
        }
      }

      const data = (await response.json()) as WordPressApiMedia

      return {
        success: true,
        output: {
          id: data.id,
          title: data.title.rendered,
          slug: data.slug,
          status: data.status,
          link: data.link,
          sourceUrl: data.source_url,
          mediaType: data.media_type,
          mimeType: data.mime_type,
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
