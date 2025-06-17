"use client";

import { useState, useRef, useEffect } from 'react';
import { useLLM } from '@/hooks/useLLM';
import { Loader2, RotateCcw } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function MockInterviewChatbot({ company, role, handleMockInterviewComplete }: { company?: string; role?: string; handleMockInterviewComplete?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        `Welcome to your mock interview! I will act as your interviewer. Let's begin.\n\nFirst, can you tell me a little about yourself and why you're interested in${company ? ` working at ${company}` : ''}${role ? ` as a ${role}` : ''}?`,
    },
  ]);
  const [input, setInput] = useState('');
  const { generateResponse, isLoading, error } = useLLM();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    try {
      const prompt = `You are a professional interviewer for${company ? ` ${company}` : ''}${role ? `, interviewing for the role of ${role}` : ''}. Continue the mock interview. Ask behavioral and role-specific questions, give feedback, and follow up based on the candidate's answers. Be conversational and supportive.`;
      const response = await generateResponse([
        { role: 'system' as const, content: prompt },
        ...newMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          `Welcome to your mock interview! I will act as your interviewer. Let's begin.\n\nFirst, can you tell me a little about yourself and why you're interested in${company ? ` working at ${company}` : ''}${role ? ` as a ${role}` : ''}?`,
      } as ChatMessage,
    ]);
    setInput('');
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Mock Interview Chatbot</h3>
        <button
          onClick={resetChat}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded transition"
          title="Reset Interview"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>
      <div className="h-72 overflow-y-auto bg-white/10 rounded-lg p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-lg text-sm whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-lg bg-white/20 text-white text-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Interviewer is typing...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2 mt-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer and press Enter..."
          className="flex-1 h-12 bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
} 