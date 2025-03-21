import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

let currentQuestionIndex = 1; // Start from question ID 1

// For testing purposes only
export function resetCurrentQuestionIndexForTesting(): void {
  currentQuestionIndex = 1;
}

// Get current question without incrementing index
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

    return { 
      question: questionRow[1], 
      questionId: currentQuestionIndex 
    }; // Return question and its ID
  } catch (error) {
    console.error('Error fetching current question from Google Sheets:', error);
    throw new Error('Failed to fetch current question from Google Sheets');
  }
}

// Manually set the question index
export function setQuestionIndex(index: number): void {
  if (index < 1) {
    throw new Error('Question index must be greater than 0');
  }
  currentQuestionIndex = index;
}

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
        questionId: 1
      }; // Return first question and its ID
    }

    // Get current question and increment index for next time
    const questionString = questionRow[1];
    const currentId = currentQuestionIndex;
    currentQuestionIndex++;

    return {
      question: questionString,
      questionId: currentId
    };
  } catch (error) {
    console.error('Error fetching question from Google Sheets:', error);
    throw new Error('Failed to fetch question from Google Sheets');
  }
}