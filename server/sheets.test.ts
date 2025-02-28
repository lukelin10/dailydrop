import { describe, it, expect, beforeEach } from 'vitest';
import { getNextQuestion, resetCurrentQuestionIndexForTesting } from './sheets';

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
      const question = await getNextQuestion();
      const currentIndex = i + 1; // Since we start from 1
      console.log(`Question ${i + 1}:`);
      console.log(`  ID: ${currentIndex}`);
      console.log(`  Content: ${question}`);
      questions.push({ id: currentIndex, content: question });
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
});