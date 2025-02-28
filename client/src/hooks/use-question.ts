
import { useQuery } from '@tanstack/react-query';

export function useCurrentQuestion() {
  return useQuery<{ question: string, currentIndex: boolean }>({
    queryKey: ['/api/question/current'],
  });
}

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
