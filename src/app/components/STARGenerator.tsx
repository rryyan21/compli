"use client";

import { useState } from 'react';
import { useLLM } from '@/hooks/useLLM';
import { Loader2 } from 'lucide-react';

interface STARInput {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export default function STARGenerator() {
  const [input, setInput] = useState<STARInput>({
    situation: '',
    task: '',
    action: '',
    result: ''
  });
  const [improvedStory, setImprovedStory] = useState<string | null>(null);
  const { generateResponse, isLoading, error } = useLLM();

  const handleInputChange = (field: keyof STARInput, value: string) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateImprovedStory = async () => {
    if (!input.situation || !input.task || !input.action) {
      return;
    }

    try {
      const prompt = `Improve this STAR story for a behavioral interview. Make it more impactful and professional while maintaining the core message. Add specific details and metrics where appropriate.

Situation: ${input.situation}
Task: ${input.task}
Action: ${input.action}
${input.result ? `Result: ${input.result}` : ''}

Format the response with clear sections and bullet points for key achievements.`;

      const response = await generateResponse([
        { role: 'user', content: prompt }
      ]);

      setImprovedStory(response);
    } catch (error) {
      console.error('Failed to generate improved story:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">STAR Story Generator</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Situation
            </label>
            <textarea
              value={input.situation}
              onChange={(e) => handleInputChange('situation', e.target.value)}
              placeholder="Describe the context and background..."
              className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Task
            </label>
            <textarea
              value={input.task}
              onChange={(e) => handleInputChange('task', e.target.value)}
              placeholder="What was your responsibility or challenge?"
              className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Action
            </label>
            <textarea
              value={input.action}
              onChange={(e) => handleInputChange('action', e.target.value)}
              placeholder="What steps did you take?"
              className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Result (Optional)
            </label>
            <textarea
              value={input.result}
              onChange={(e) => handleInputChange('result', e.target.value)}
              placeholder="What was the outcome?"
              className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={generateImprovedStory}
            disabled={isLoading || !input.situation || !input.task || !input.action}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="inline mr-2 animate-spin" />
                Improving Story...
              </>
            ) : (
              'Improve Story'
            )}
          </button>

          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {improvedStory && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Improved Story</h3>
          <div className="whitespace-pre-line text-white/80">
            {improvedStory}
          </div>
        </div>
      )}
    </div>
  );
} 