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
          console.log("🔍 Direct fetch starting...");
          const response = await fetch('/api/question', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch question: ${response.status} ${response.statusText}`);
          }
          
          const text = await response.text(); // First get as text for debugging
          console.log("📡 Raw API response:", text);
          
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error("❌ JSON parse error:", e);
            throw new Error('Invalid JSON response');
          }
          
          console.log("📝 Parsed data:", data);
          
          if (data && typeof data.question === 'string' && typeof data.questionId === 'number') {
            console.log("✅ Setting question from direct fetch:", data.question);
            setQuestion(data.question);
            setQuestionId(data.questionId);
          } else {
            console.warn("⚠️ Data format issue:", data);
            throw new Error('Question data is missing required fields or has incorrect types');
          }
        } catch (err) {
          console.error('❌ Error in direct fetch:', err);
          setError(err instanceof Error ? err : new Error('Unknown error in fetch'));
        } finally {
          setLoading(false);
        }
      };
      
      // Execute immediately
      fetchQuestion();
      
      // Also set a timeout as a last resort
      const timeoutId = setTimeout(() => {
        if (!question) {
          console.log("⏱️ Timeout reached, retrying direct fetch");
          fetchQuestion();
        }
      }, 1500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [queryResult.data, question]);

  return {
    question,
    questionId,
    loading: loading || queryResult.isLoading,
    error: error || queryResult.error
  };
}