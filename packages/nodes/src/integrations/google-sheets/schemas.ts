import { z } from 'zod';

export const appendInputSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID required'),
  range: z.string().default('Sheet1!A:Z'),
  values: z.array(z.array(z.any())),          // rows as 2D list
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).default('USER_ENTERED'),
});

export const appendOutputSchema = z.object({
  updatedRange: z.string(),
  updatedRows: z.number(),
  updatedCells: z.number(),
});