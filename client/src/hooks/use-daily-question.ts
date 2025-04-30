import { useEffect, useState, useRef, useCallback } from 'react';
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
  
  // Track fetch attempts to prevent infinite loops
  const attemptCount = useRef(0);
  // Track if the component is mounted
  const mounted = useRef(true);

  // Memoized fetch function with the latest best practices
  const fetchQuestionDirectly = useCallback(async () => {
    if (attemptCount.current >= 3 || !mounted.current) {
      return false; // Limit attempts to prevent infinite loops
    }
    
    attemptCount.current++;
    
    try {
      setLoading(true);
      console.log(`🔍 Direct fetch starting... (attempt ${attemptCount.current})`);
      
      // Create a timestamp parameter to prevent caching
      const timestamp = new Date().getTime();
      
      // In production, include the full absolute URL to bypass potential routing issues
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/question?_t=${timestamp}`;
      console.log("📡 Using absolute URL:", url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest' // Helps identify AJAX requests
        },
        // Skip any cache, force network request
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status} ${response.statusText}`);
      }
      
      // Log content type for debugging
      const contentType = response.headers.get('content-type');
      console.log("📄 Response content type:", contentType);
      
      const text = await response.text(); // First get as text for debugging
      console.log("📡 Raw API response:", text);
      
      // Check if response is HTML instead of JSON (happens in production)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.warn("⚠️ HTML response detected instead of JSON");
        // Only set error if we're still mounted
        if (mounted.current) {
          setError(new Error('API returned HTML instead of JSON data'));
        }
        return false;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("❌ JSON parse error:", e);
        if (mounted.current) {
          setError(new Error('Invalid JSON response from API'));
        }
        return false;
      }
      
      console.log("📝 Parsed data:", data);
      
      if (data && typeof data.question === 'string' && typeof data.questionId === 'number') {
        console.log("✅ Setting question from direct fetch:", data.question);
        if (mounted.current) {
          setQuestion(data.question);
          setQuestionId(data.questionId);
          setError(null);
        }
        return true;
      } else {
        console.warn("⚠️ Data format issue:", data);
        if (mounted.current) {
          setError(new Error('Question data is missing required fields or has incorrect types'));
        }
        return false;
      }
    } catch (err) {
      console.error('❌ Error in direct fetch:', err);
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error('Unknown error in fetch'));
      }
      return false;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

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

  // Direct fetch as a primary approach to ensure we get data
  useEffect(() => {
    // Always fetch directly regardless of React Query to ensure we get data
    const fetchAndRetry = async () => {
      // First attempt
      const success = await fetchQuestionDirectly();
      if (success || !mounted.current) return;
      
      // First retry with increasing delay
      setTimeout(async () => {
        if (!mounted.current) return;
        const retrySuccess = await fetchQuestionDirectly();
        if (retrySuccess || !mounted.current) return;
        
        // Second retry with even longer delay
        setTimeout(async () => {
          if (mounted.current) {
            await fetchQuestionDirectly();
          }
        }, 2000); // 2 second delay for final retry
      }, 1000); // 1 second delay for first retry
    };
    
    fetchAndRetry();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted.current = false;
    };
  }, []); // Only run once on mount

  // Export the question state
  return {
    question,
    questionId,
    loading: loading || queryResult.isLoading,
    error: error || queryResult.error
  };
}