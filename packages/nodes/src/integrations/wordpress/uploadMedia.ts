import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import { resolveWordPressAuth } from './utils.js'
import {
  WordPressUploadMediaInputSchema,
  WordPressUploadMediaOutputSchema,
  type WordPressUploadMediaInput,
  type WordPressApiMedia,
  normalizeWordPressMedia,
} from './schemas.js'

export const wordpressUploadMediaNode = defineNode({
  type: 'wordpressUploadMedia',
  name: 'WordPress Upload Media',
  description: 'Upload a media file to the WordPress media library',
  category: 'integration',
  inputSchema: WordPressUploadMediaInputSchema,
  outputSchema: WordPressUploadMediaOutputSchema,
  estimatedDuration: 10,
  capabilities: {
    supportsRerun: false,
  },
  executor: async (input: WordPressUploadMediaInput, context) => {
    try {
      const authResult = resolveWordPressAuth(context.credentials?.wordpress)
      if ('error' in authResult) {
        return { success: false, error: authResult.error }
      }
      const { baseUrl, authHeader } = authResult

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
        output: normalizeWordPressMedia(data),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
