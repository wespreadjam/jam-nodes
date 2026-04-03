import { describe, it, expect } from 'vitest';
import { GoogleSheetsCredential } from '../googleSheets';
import { googleSheetsAppendNode } from '../googleSheetsAppend';
import { googleSheetsClearNode } from '../googleSheetsClear';
import { googleSheetsReadNode } from '../googleSheetsRead';
import { googleSheetsUpdateNode } from '../googleSheetsUpdate';
import {
  appendInputSchema,
  appendOutputSchema,
  clearInputSchema,
  clearOutputSchema,
  readInputSchema,
  readOutputSchema,
  updateInputSchema,
  updateOutputSchema,
} from '../schemas';

// ---------------------------------------------------------------------------
// Credential definition
// ---------------------------------------------------------------------------

describe('GoogleSheetsCredential', () => {
  it('should be defined and have correct name', () => {
    expect(GoogleSheetsCredential).toBeDefined();
    expect(GoogleSheetsCredential.name).toBe('googleSheets');
  });

  it('should have OAuth2 configuration', () => {
    expect(GoogleSheetsCredential.config.authorizationUrl).toContain('accounts.google.com');
    expect(GoogleSheetsCredential.config.tokenUrl).toContain('googleapis.com');
    expect(GoogleSheetsCredential.config.scopes.length).toBeGreaterThan(0);
  });

  it('should validate a valid credential schema', () => {
    const result = GoogleSheetsCredential.schema.safeParse({
      accessToken: 'ya29.mock-token',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty accessToken', () => {
    const result = GoogleSheetsCredential.schema.safeParse({
      accessToken: '',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Node metadata
// ---------------------------------------------------------------------------

describe('Google Sheets node metadata', () => {
  it('googleSheetsAppendNode has correct type', () => {
    expect(googleSheetsAppendNode.type).toBe('googleSheetsAppend');
  });

  it('googleSheetsClearNode has correct type', () => {
    expect(googleSheetsClearNode.type).toBe('googleSheetsClear');
  });

  it('googleSheetsReadNode has correct type', () => {
    expect(googleSheetsReadNode.type).toBe('googleSheetsRead');
  });

  it('googleSheetsUpdateNode has correct type', () => {
    expect(googleSheetsUpdateNode.type).toBe('googleSheetsUpdate');
  });
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('Google Sheets schemas', () => {
  describe('appendInputSchema', () => {
    it('should accept valid input', () => {
      const result = appendInputSchema.safeParse({
        spreadsheetId: 'abc123',
        values: [['a', 'b'], ['c', 'd']],
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing spreadsheetId', () => {
      const result = appendInputSchema.safeParse({
        values: [['a']],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('readInputSchema', () => {
    it('should accept valid input', () => {
      const result = readInputSchema.safeParse({
        spreadsheetId: 'abc123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('clearInputSchema', () => {
    it('should accept valid input', () => {
      const result = clearInputSchema.safeParse({
        spreadsheetId: 'abc123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateInputSchema', () => {
    it('should accept valid input', () => {
      const result = updateInputSchema.safeParse({
        spreadsheetId: 'abc123',
        rowNumber: 1,
        values: ['a', 'b'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject rowNumber < 1', () => {
      const result = updateInputSchema.safeParse({
        spreadsheetId: 'abc123',
        rowNumber: 0,
        values: ['a'],
      });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Executor – credential guard
// ---------------------------------------------------------------------------

describe('Google Sheets executor credential checks', () => {
  const mockContext = {
    userId: 'test',
    workflowExecutionId: 'test',
    credentials: {},
    variables: {},
    interpolate: (s: string) => s,
    evaluateJsonPath: (s: string) => s,
  };

  it('appendNode returns error without credentials', async () => {
    const result = await googleSheetsAppendNode.executor(
      { spreadsheetId: 'abc', values: [['x']], range: 'Sheet1!A:Z', valueInputOption: 'USER_ENTERED' },
      mockContext as any,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('readNode returns error without credentials', async () => {
    const result = await googleSheetsReadNode.executor(
      { spreadsheetId: 'abc', range: 'Sheet1!A:Z' },
      mockContext as any,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('clearNode returns error without credentials', async () => {
    const result = await googleSheetsClearNode.executor(
      { spreadsheetId: 'abc', range: 'Sheet1!A:Z' },
      mockContext as any,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('updateNode returns error without credentials', async () => {
    const result = await googleSheetsUpdateNode.executor(
      { spreadsheetId: 'abc', rowNumber: 1, values: ['x'], valueInputOption: 'USER_ENTERED' },
      mockContext as any,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
