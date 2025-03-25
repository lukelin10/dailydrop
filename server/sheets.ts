/**
 * Google Sheets Integration Module
 * 
 * This module manages the connection to Google Sheets to retrieve daily questions.
 * It handles authentication, fetching questions based on an index, and maintaining
 * question sequence over time.
 * 
 * The integration expects:
 * - A Google Sheet with questions in column B
 * - Question IDs (numerical) in column A
 * - Environment variables for authentication (GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_ID)
 */
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

/**
 * Tracks the current question index to be fetched from the spreadsheet
 * This index refers to the ID in column A of the Google Sheet
 * It increments each day to provide a new question to users
 */
let currentQuestionIndex = 1; // Start from question ID 1

/**
 * Resets the question index back to 1
 * 
 * Used primarily for testing to ensure a consistent starting point
 * Should not be called in production except when needed to restart the question sequence
 */
export function resetCurrentQuestionIndexForTesting(): void {
  currentQuestionIndex = 1;
}

/**
 * Retrieves the current day's question without incrementing the index
 * 
 * Looks up the question in the Google Sheet where the ID (column A) matches currentQuestionIndex
 * Returns both the question text and its ID
 * 
 * @returns Promise containing the question text and ID
 */
export async function getCurrentQuestion(): Promise<{ question: string, questionId: number }> {
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'A2:B', // Get both columns starting from row 2
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      throw new Error('No questions found in the spreadsheet');
    }

    // Find the row with matching questionID
    const questionRow = rows.find(row => parseInt(row[0]) === currentQuestionIndex);

    if (!questionRow) {
      throw new Error(`Could not find question with ID ${currentQuestionIndex}`);
    }

    // Return the question with its actual ID from the sheet (column A)
    return { 
      question: questionRow[1], 
      questionId: parseInt(questionRow[0]) 
    }; // Return question and its ID from sheet
  } catch (error) {
    console.error('Error fetching current question from Google Sheets:', error);
    throw new Error('Failed to fetch current question from Google Sheets');
  }
}

/**
 * Manually sets the question index to a specific value
 * 
 * This function allows administrators to jump to a specific question
 * or reset the sequence to a particular point. It enforces that the
 * index is always positive (greater than 0).
 * 
 * @param index - The question index to set (must be > 0)
 * @throws Error if index is less than 1
 */
export function setQuestionIndex(index: number): void {
  if (index < 1) {
    throw new Error('Question index must be greater than 0');
  }
  currentQuestionIndex = index;
}

/**
 * Retrieves the current day's question and increments the index for tomorrow
 * 
 * This is the primary method for getting the daily question. It:
 * 1. Fetches the question matching the current index
 * 2. Increments the index for the next day
 * 3. Returns the question text and ID
 * 
 * If the current index doesn't match any question, it resets to index 1
 * 
 * @returns Promise containing the question text and ID
 */
export async function getNextQuestion(): Promise<{ question: string, questionId: number }> {
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'A2:B', // Get both columns starting from row 2
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      throw new Error('No questions found in the spreadsheet');
    }

    // Find the row with matching questionID
    const questionRow = rows.find(row => parseInt(row[0]) === currentQuestionIndex);

    if (!questionRow) {
      // If we can't find the current index, start over from 1
      currentQuestionIndex = 1;
      const firstRow = rows.find(row => parseInt(row[0]) === 1);
      if (!firstRow) {
        throw new Error('Could not find question with ID 1');
      }
      return {
        question: firstRow[1],
        questionId: parseInt(firstRow[0])
      }; // Return first question and its ID from sheet
    }

    // Get current question and increment index for next time
    const questionString = questionRow[1];
    const questionId = parseInt(questionRow[0]); // Use the actual question ID from the sheet
    currentQuestionIndex++; // Still increment our index for the next query

    return {
      question: questionString,
      questionId: questionId // Return the actual question ID from the sheet
    };
  } catch (error) {
    console.error('Error fetching question from Google Sheets:', error);
    throw new Error('Failed to fetch question from Google Sheets');
  }
}