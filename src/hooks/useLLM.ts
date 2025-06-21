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

      if (process.env.NODE_ENV !== 'production') {
        console.log('[useLLM] Sending messages to LLM:', messages);
      }

      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          userId: user ? user.uid : 'public',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      const data = await response.json();

      if (process.env.NODE_ENV !== 'production') {
        console.log('[useLLM] Raw LLM response:', data);
      }

      const content = data?.choices?.[0]?.message?.content;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[useLLM] Extracted content:', content);
      }

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