import { z } from 'zod'
import { defineBasicCredential } from '@jam-nodes/core'

export const WordPressCredential = defineBasicCredential({
  name: 'wordpress',
  displayName: 'WordPress Application Password',
  documentationUrl:
    'https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/',
  schema: z.object({
    siteUrl: z.string().url(),
    username: z.string(),
    applicationPassword: z.string(),
  }),
  authenticate: {
    type: 'header',
    properties: {
      // Authorization header is computed at runtime as:
      // Basic base64(username:applicationPassword)
      Authorization: 'Basic {{base64(username:applicationPassword)}}',
    },
  },
  testRequest: {
    url: '{{siteUrl}}/wp-json/wp/v2/users/me',
    method: 'GET',
  },
})
