import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Question {
  question: string;
  questionId: number;
}

/**
 * Custom hook to reliably fetch and manage the daily question
 * This hook ensures the question is fetched properly in both development and production
 */
export function useDailyQuestion() {
  // Local state for tracking question data
  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Standard React Query fetch
  const queryResult = useQuery<Question>({
    queryKey: ['/api/question'],
  });

  // Effect for handling the question data from React Query
  useEffect(() => {
    if (queryResult.data) {
      setQuestion(queryResult.data.question);
      setQuestionId(queryResult.data.questionId);
      setLoading(false);
    } else if (queryResult.error) {
      console.error('Error in React Query fetch:', queryResult.error);
      setError(queryResult.error instanceof Error ? queryResult.error : new Error('Unknown error'));
    }
  }, [queryResult.data, queryResult.error]);

  // Direct fetch as a backup in case React Query behaves differently in production
  useEffect(() => {
    // Only perform direct fetch if React Query hasn't provided data yet
    if (!queryResult.data && !question) {
      const fetchQuestion = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/question', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch question: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          if (data && data.question && data.questionId) {
            setQuestion(data.question);
            setQuestionId(data.questionId);
          } else {
            throw new Error('Question data is missing required fields');
          }
        } catch (err) {
          console.error('Error in direct fetch:', err);
          setError(err instanceof Error ? err : new Error('Unknown error in fetch'));
        } finally {
          setLoading(false);
        }
      };
      
      fetchQuestion();
    }
  }, [queryResult.data, question]);

  return {
    question,
    questionId,
    loading: loading || queryResult.isLoading,
    error: error || queryResult.error
  };
}