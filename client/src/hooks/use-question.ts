
/**
 * Question Hooks Module
 * 
 * This module provides React hooks for working with the daily question system.
 * It enables components to fetch the current question and reset the question index.
 */
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch the current question without incrementing the index
 * 
 * This is primarily used for admin or debugging purposes to check
 * what the current question is without affecting the sequence.
 * 
 * @returns Query result containing the current question and a flag
 *          indicating it's the current index
 */
export function useCurrentQuestion() {
  return useQuery<{ question: string, currentIndex: boolean }>({
    queryKey: ['/api/question/current'],
  });
}

/**
 * Hook to reset the question index to a specific value
 * 
 * This allows administrators to:
 * - Jump to a specific question in the sequence
 * - Restart the question sequence from the beginning
 * - Test different questions by manually setting the index
 * 
 * @param index - The index to set as the new current question index
 * @returns Function that when called will reset the question index
 */
export function useResetQuestion(index: number) {
  const resetQuestion = async () => {
    const response = await fetch('/api/question/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ index }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset question index');
    }
    
    return response.json();
  };
  
  return resetQuestion;
}
