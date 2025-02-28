import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNextQuestion, resetCurrentQuestionIndexForTesting } from './sheets';
import { google } from 'googleapis';

// Mock google.sheets
vi.mock('googleapis', () => ({
  google: {
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: [
                ['1', 'Question One'],
                ['2', 'Question Two'],
                ['3', 'Question Three']
              ]
            }
          })
        }
      }
    })
  }
}));

// Mock GoogleAuth
vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({}))
}));

describe('sheets.ts', () => {
  beforeEach(() => {
    // Reset the question index before each test
    resetCurrentQuestionIndexForTesting();
    // Clear the process.env mock
    vi.resetModules();

    // Mock process.env
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test@example.com';
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test-key';
    process.env.GOOGLE_SHEETS_ID = 'test-sheet-id';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return questions in order and increment the index', async () => {
    // Get first question (ID: 1)
    const question1 = await getNextQuestion();
    expect(question1).toBe('Question One');

    // Get second question (ID: 2)
    const question2 = await getNextQuestion();
    expect(question2).toBe('Question Two');

    // Get third question (ID: 3)
    const question3 = await getNextQuestion();
    expect(question3).toBe('Question Three');

    // Should wrap back to first question (ID: 1)
    const questionAgain = await getNextQuestion();
    expect(questionAgain).toBe('Question One');
  });

  it('should throw an error if no questions are found', async () => {
    // Mock empty response
    vi.mocked(google.sheets).mockReturnValueOnce({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: []
            }
          })
        }
      }
    } as any);

    await expect(getNextQuestion()).rejects.toThrow('Failed to fetch question from Google Sheets');
  });

  it('should throw an error if question ID 1 is not found when wrapping around', async () => {
    // Mock response without ID 1
    vi.mocked(google.sheets).mockReturnValueOnce({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: [
                ['2', 'Question Two'],
                ['3', 'Question Three']
              ]
            }
          })
        }
      }
    } as any);

    // Set index to a value that will trigger wrap-around
    resetCurrentQuestionIndexForTesting();
    await expect(getNextQuestion()).rejects.toThrow('Could not find question with ID 1');
  });
});