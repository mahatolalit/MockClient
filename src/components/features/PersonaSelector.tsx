import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PersonaSettings, ClarityLevel, BehaviorType } from '@/lib/prompts';

interface PersonaSelectorProps {
  onPersonaChange: (settings: PersonaSettings) => void;
  onStartSession: () => void;
  isGenerating?: boolean;
}

export function PersonaSelector({ onPersonaChange, onStartSession, isGenerating = false }: PersonaSelectorProps) {
  const [clarity, setClarity] = useState<ClarityLevel>('moderate');
  const [behavior, setBehavior] = useState<BehaviorType>('accepting');
  const [role, setRole] = useState<'frontend' | 'backend' | 'ui-designer'>('frontend');

  const handleStart = () => {
    onPersonaChange({ clarity, behavior, role });
    onStartSession();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">MockClient</h1>
        <p className="text-lg text-gray-600">
          Practice dealing with clients before you sign a real contract
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configure Your Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Your Role</label>
            <div className="grid grid-cols-3 gap-3">
              {(['frontend', 'backend', 'ui-designer'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                    role === r
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {r === 'ui-designer' ? 'UI Designer' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Clarity Level */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Clarity Level</label>
            <div className="space-y-2">
              {([
                { value: 'full', label: 'Full', desc: 'Detailed specs, color codes, tech stack' },
                { value: 'moderate', label: 'Moderate', desc: 'General goals, ask for details' },
                { value: 'low', label: 'Low', desc: 'Vague requests like "make it pop"' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setClarity(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    clarity === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Behavior Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Client Behavior</label>
            <div className="space-y-2">
              {([
                { value: 'accepting', label: 'Accepting', desc: 'Easy-going, minimal revisions' },
                { value: 'skeptical', label: 'Skeptical', desc: 'Questions choices, demands proof' },
                { value: 'picky', label: 'Picky', desc: 'Pixel-perfect obsession' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBehavior(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    behavior === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleStart} className="w-full" size="lg" disabled={isGenerating}>
            {isGenerating ? 'Generating Client...' : 'Start Session'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
