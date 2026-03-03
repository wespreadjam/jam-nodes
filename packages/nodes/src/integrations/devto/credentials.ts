import { z } from 'zod'
import { defineApiKeyCredential } from '@jam-nodes/core'

export const devtoCredential = defineApiKeyCredential({
  name: 'devto',
  displayName: 'Dev.to API Key',
  documentationUrl: 'https://developers.forem.com/api#section/Authentication',
  schema: z.object({
    apiKey: z.string(),
  }),
  authenticate: {
    type: 'header',
    properties: {
      'api-key': '{{apiKey}}',
    },
  },
})
