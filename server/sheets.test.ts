
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
              values: [['Question 1'], ['Question 2'], ['Question 3']]
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

  it('should return the next question and increment the index', async () => {
    // Get the first question
    const question1 = await getNextQuestion();
    expect(question1).toBe('Question 1');
    
    // Get the second question
    const question2 = await getNextQuestion();
    expect(question2).toBe('Question 2');
    
    // Get the third question
    const question3 = await getNextQuestion();
    expect(question3).toBe('Question 3');
    
    // Test that it wraps around to the first question again
    const questionAgain = await getNextQuestion();
    expect(questionAgain).toBe('Question 1');
  });

  it('should throw an error if no questions are found', async () => {
    // Mock the implementation for this specific test
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
});
