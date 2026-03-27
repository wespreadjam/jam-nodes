import { z } from 'zod';
import { defineBearerCredential } from '@jam-nodes/core';

export const apifyCredential = defineBearerCredential({
  name: 'apify',
  displayName: 'Apify API Token',
  documentationUrl: 'https://docs.apify.com/platform/integrations/api',
  schema: z.object({
    apiToken: z.string(),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bearer {{apiToken}}',
    },
  },
});
