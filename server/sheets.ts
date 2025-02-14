import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

let currentQuestionIndex = 0;

export async function getNextQuestion(): Promise<string> {
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
      range: 'A:A', // Assuming questions are in column A
    });

    const questions = response.data.values?.flat() || [];
    
    if (questions.length === 0) {
      throw new Error('No questions found in the spreadsheet');
    }

    // Get next question and increment index
    const question = questions[currentQuestionIndex];
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    
    return question;
  } catch (error) {
    console.error('Error fetching question from Google Sheets:', error);
    throw new Error('Failed to fetch question from Google Sheets');
  }
}
