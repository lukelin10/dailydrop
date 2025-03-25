import { describe, it, expect, beforeEach } from 'vitest';
import { getNextQuestion, resetCurrentQuestionIndexForTesting, getCurrentQuestion, setQuestionIndex } from './sheets';

describe('sheets.ts', () => {
  beforeEach(() => {
    // Reset the question index before each test
    resetCurrentQuestionIndexForTesting();
  });

  it('should fetch sequential questions from production Google Sheet', async () => {
    // Use actual credentials
    const questions = [];
    console.log('\nFetching questions from production Google Sheet:');

    // Fetch 3 questions
    for (let i = 0; i < 3; i++) {
      const questionData = await getNextQuestion();
      console.log(`Question ${i + 1}:`);
      console.log(`  ID: ${questionData.questionId}`);
      console.log(`  Content: ${questionData.question}`);
      questions.push({ id: questionData.questionId, content: questionData.question });
    }

    // Verify questions are unique
    const uniqueQuestions = new Set(questions.map(q => q.content));
    expect(uniqueQuestions.size).toBe(3);
    console.log('\nAll questions are unique:', uniqueQuestions.size === 3);

    // Verify IDs are sequential
    const ids = questions.map(q => q.id);
    const isSequential = ids.every((id, index) => {
      return index === 0 || id === ids[index - 1] + 1;
    });
    expect(isSequential).toBe(true);
    console.log('IDs are sequential:', isSequential);

    // Print final verification
    console.log('\nTest summary:');
    console.log('- Number of questions fetched:', questions.length);
    console.log('- Questions are unique:', uniqueQuestions.size === 3);
    console.log('- IDs are sequential:', isSequential);
  });

  it('should increment question index over multiple days', async () => {
    console.log('\nTesting daily question index incrementation:');
    
    // Day 1: Get the first question (index should be 1)
    const day1Question = await getCurrentQuestion();
    console.log('Day 1:');
    console.log(`  ID: ${day1Question.questionId}`);
    console.log(`  Question: ${day1Question.question}`);
    const startIndex = day1Question.questionId;
    
    // Day 2: Increment to next day (index should be 2)
    setQuestionIndex(startIndex + 1);
    const day2Question = await getCurrentQuestion();
    console.log('Day 2:');
    console.log(`  ID: ${day2Question.questionId}`);
    console.log(`  Question: ${day2Question.question}`);
    
    // Day 3: Increment to next day (index should be 3) 
    setQuestionIndex(startIndex + 2);
    const day3Question = await getCurrentQuestion();
    console.log('Day 3:');
    console.log(`  ID: ${day3Question.questionId}`);
    console.log(`  Question: ${day3Question.question}`);
    
    // Day 4: Increment to next day (index should be 4)
    setQuestionIndex(startIndex + 3);
    const day4Question = await getCurrentQuestion();
    console.log('Day 4:');
    console.log(`  ID: ${day4Question.questionId}`);
    console.log(`  Question: ${day4Question.question}`);
    
    // Verify that the IDs are sequential
    const ids = [
      day1Question.questionId,
      day2Question.questionId,
      day3Question.questionId,
      day4Question.questionId
    ];
    
    // Check if IDs are sequential and increasing
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBe(ids[i-1] + 1);
    }
    
    // Verify the difference between first and last ID is 3 (since we're checking 4 days)
    expect(ids[3] - ids[0]).toBe(3);
    
    console.log('\nTest summary:');
    console.log('- Starting question ID:', startIndex);
    console.log('- Ending question ID after 3 days:', startIndex + 3);
    console.log('- Question IDs increment correctly:', ids[3] - ids[0] === 3);
  });
});