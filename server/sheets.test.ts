/**
 * Question System Unit Tests
 * 
 * This test suite verifies the functionality of the daily question system,
 * focusing on:
 * 1. Fetching questions from Google Sheets
 * 2. Ensuring question IDs are properly retrieved from column A
 * 3. Verifying that the question index increments correctly over time
 * 4. Testing that questions change sequentially day by day
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getNextQuestion, resetCurrentQuestionIndexForTesting, getCurrentQuestion, setQuestionIndex } from './sheets';

describe('sheets.ts', () => {
  /**
   * Reset the question index before each test
   * 
   * This ensures each test starts with a clean state,
   * independent of other tests in the suite.
   */
  beforeEach(() => {
    resetCurrentQuestionIndexForTesting();
  });

  /**
   * Test 1: Fetching Sequential Questions
   * 
   * This test verifies that:
   * - Questions can be successfully fetched from Google Sheets
   * - Each question has a unique content and ID
   * - Question IDs follow a sequential pattern (1, 2, 3, etc.)
   */
  it('should fetch sequential questions from production Google Sheet', async () => {
    // Store questions for verification
    const questions = [];
    console.log('\nFetching questions from production Google Sheet:');

    // Fetch 3 sequential questions, simulating 3 days of use
    for (let i = 0; i < 3; i++) {
      const questionData = await getNextQuestion();
      console.log(`Question ${i + 1}:`);
      console.log(`  ID: ${questionData.questionId}`);
      console.log(`  Content: ${questionData.question}`);
      questions.push({ id: questionData.questionId, content: questionData.question });
    }

    // Verification 1: Ensure all questions have unique content
    const uniqueQuestions = new Set(questions.map(q => q.content));
    expect(uniqueQuestions.size).toBe(3);
    console.log('\nAll questions are unique:', uniqueQuestions.size === 3);

    // Verification 2: Ensure question IDs are sequential (1, 2, 3, etc.)
    const ids = questions.map(q => q.id);
    const isSequential = ids.every((id, index) => {
      return index === 0 || id === ids[index - 1] + 1;
    });
    expect(isSequential).toBe(true);
    console.log('IDs are sequential:', isSequential);

    // Summary output for manual verification
    console.log('\nTest summary:');
    console.log('- Number of questions fetched:', questions.length);
    console.log('- Questions are unique:', uniqueQuestions.size === 3);
    console.log('- IDs are sequential:', isSequential);
  });

  /**
   * Test 2: Question Index Incrementation
   * 
   * This test simulates 4 consecutive days of usage and verifies:
   * - The question index increments correctly day by day
   * - Each day presents a new question with the next ID
   * - The sequence maintains proper order (not skipping or repeating)
   */
  it('should increment question index over multiple days', async () => {
    console.log('\nTesting daily question index incrementation:');
    
    // Day 1: Initial state - first question
    const day1Question = await getCurrentQuestion();
    console.log('Day 1:');
    console.log(`  ID: ${day1Question.questionId}`);
    console.log(`  Question: ${day1Question.question}`);
    const startIndex = day1Question.questionId;
    
    // Day 2: Simulate moving to next day
    setQuestionIndex(startIndex + 1);
    const day2Question = await getCurrentQuestion();
    console.log('Day 2:');
    console.log(`  ID: ${day2Question.questionId}`);
    console.log(`  Question: ${day2Question.question}`);
    
    // Day 3: Simulate moving to next day
    setQuestionIndex(startIndex + 2);
    const day3Question = await getCurrentQuestion();
    console.log('Day 3:');
    console.log(`  ID: ${day3Question.questionId}`);
    console.log(`  Question: ${day3Question.question}`);
    
    // Day 4: Simulate moving to next day
    setQuestionIndex(startIndex + 3);
    const day4Question = await getCurrentQuestion();
    console.log('Day 4:');
    console.log(`  ID: ${day4Question.questionId}`);
    console.log(`  Question: ${day4Question.question}`);
    
    // Collect all question IDs for verification
    const ids = [
      day1Question.questionId,
      day2Question.questionId,
      day3Question.questionId,
      day4Question.questionId
    ];
    
    // Verification 1: Each day's ID should be exactly 1 more than previous day
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBe(ids[i-1] + 1);
    }
    
    // Verification 2: The total progression should be exactly 3 steps
    // (from day 1 to day 4 is a difference of 3)
    expect(ids[3] - ids[0]).toBe(3);
    
    // Summary output for manual verification
    console.log('\nTest summary:');
    console.log('- Starting question ID:', startIndex);
    console.log('- Ending question ID after 3 days:', startIndex + 3);
    console.log('- Question IDs increment correctly:', ids[3] - ids[0] === 3);
  });
});