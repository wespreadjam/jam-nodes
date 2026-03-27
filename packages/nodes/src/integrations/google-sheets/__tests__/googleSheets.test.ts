import { describe, it, expect, vi, beforeEach } from 'vitest';
import { googleSheetsAppendNode } from '../googleSheetsAppend.js';
import { googleSheetsClearNode } from '../googleSheetsClear.js';
import { googleSheetsReadNode } from '../googleSheetsRead.js';
import { googleSheetsUpdateNode } from '../googleSheetsUpdate.js';

const mockCredentials = {
  googleSheets: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 3600000,
  },
};

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('googleSheetsAppendNode', () => {
  it('returns failure when credentials are missing', async () => {
    const result = await googleSheetsAppendNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        values: [['test']],
      },
      { credentials: {} } as any
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('appends rows successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        updates: {
          updatedRange: 'Sheet1!A1:B2',
          updatedRows: 2,
          updatedColumns: 2,
          updatedCells: 4,
        },
      }),
    });

    const result = await googleSheetsAppendNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        values: [['Name', 'Email'], ['Test', 'test@example.com']],
      },
      { credentials: mockCredentials } as any
    );
    expect(result.success).toBe(true);
    expect(result.output?.updatedRows).toBe(2);
  });
});

describe('googleSheetsReadNode', () => {
  it('returns failure when credentials are missing', async () => {
    const result = await googleSheetsReadNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        range: 'Sheet1!A1:Z100',
      },
      { credentials: {} } as any
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('reads rows successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        values: [['Name', 'Email'], ['Test', 'test@example.com']],
      }),
    });

    const result = await googleSheetsReadNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        range: 'Sheet1!A1:Z100',
      },
      { credentials: mockCredentials } as any
    );
    expect(result.success).toBe(true);
    expect(result.output?.rowCount).toBe(2);
    expect(result.output?.rows).toHaveLength(2);
  });
});

describe('googleSheetsUpdateNode', () => {
  it('returns failure when credentials are missing', async () => {
    const result = await googleSheetsUpdateNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        rowNumber: 2,
        values: ['test'],
        valueInputOption: 'RAW',
      },
      { credentials: {} } as any
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('updates row successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        updatedRange: 'Sheet1!A2:A2',
        updatedRows: 1,
        updatedColumns: 1,
        updatedCells: 1,
      }),
    });

    const result = await googleSheetsUpdateNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        rowNumber: 2,
        values: ['Updated'],
        valueInputOption: 'RAW',
      },
      { credentials: mockCredentials } as any
    );
    expect(result.success).toBe(true);
    expect(result.output?.updatedRows).toBe(1);
  });
});

describe('googleSheetsClearNode', () => {
  it('returns failure when credentials are missing', async () => {
    const result = await googleSheetsClearNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        range: 'Sheet1!A1:Z100',
      },
      { credentials: {} } as any
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('clears range successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        clearedRange: 'Sheet1!A1:Z100',
      }),
    });

    const result = await googleSheetsClearNode.executor(
      {
        spreadsheetId: 'test-spreadsheet',
        range: 'Sheet1!A1:Z100',
      },
      { credentials: mockCredentials } as any
    );
    expect(result.success).toBe(true);
    expect(result.output?.clearedRange).toBe('Sheet1!A1:Z100');
  });
});
