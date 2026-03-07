import { z } from 'zod';
import { appendInputSchema, appendOutputSchema } from './schemas';

export type AppendInput = z.infer<typeof appendInputSchema>;
export type AppendOutput = z.infer<typeof appendOutputSchema>;