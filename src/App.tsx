import { useState } from 'react';
import { PersonaSelector } from './components/features/PersonaSelector';
import { ChatInterface } from './components/chat/ChatInterface';
import { generateUniqueProjectBrief, type PersonaSettings } from './lib/prompts';

function App() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [personaSettings, setPersonaSettings] = useState<PersonaSettings>({
    clarity: 'moderate',
    behavior: 'accepting',
    role: 'frontend',
  });
  const [initialBrief, setInitialBrief] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePersonaChange = (settings: PersonaSettings) => {
    setPersonaSettings(settings);
  };

  const handleStartSession = async () => {
    setIsGenerating(true);
    try {
      const brief = await generateUniqueProjectBrief(personaSettings);
      setInitialBrief(brief);
      setSessionStarted(true);
    } catch (error) {
      console.error('Failed to generate project brief:', error);
      // Fallback to a simple message
      setInitialBrief('Hey! I have a project I need help with. Can you build it for me?');
      setSessionStarted(true);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!sessionStarted) {
    return (
      <PersonaSelector
        onPersonaChange={handlePersonaChange}
        onStartSession={handleStartSession}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <ChatInterface
      personaSettings={personaSettings}
      initialMessage={initialBrief}
    />
  );
}

export default App;

