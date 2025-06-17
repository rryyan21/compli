import { useState } from 'react';
import { auth } from '@/lib/firebase';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UseLLMReturn {
  generateResponse: (messages: Message[]) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useLLM(): UseLLMReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = async (messages: Message[]): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be signed in to use AI features');
      }

      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('No AI response received');
      return content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateResponse,
    isLoading,
    error,
  };
} 