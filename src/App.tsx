import { useState } from 'react';
import { PersonaSelector } from './components/features/PersonaSelector';
import { ChatInterface } from './components/chat/ChatInterface';
import { HistorySidebar } from './components/chat/HistorySidebar';
import { generateUniqueProjectBrief, type PersonaSettings } from './lib/prompts';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { useAuth } from './context/AuthContext';
import type { StoredSession } from './lib/appwrite';

function AuthGate() {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />;
  }
  return <LoginPage onSwitchToRegister={() => setShowRegister(true)} />;
}

type View =
  | { type: 'home' }
  | { type: 'new-chat'; personaSettings: PersonaSettings; initialBrief: string }
  | { type: 'resume'; session: StoredSession };

function AppContent() {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>({ type: 'home' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  const [pendingSettings, setPendingSettings] = useState<PersonaSettings>({
    clarity: 'moderate',
    behavior: 'accepting',
    role: 'frontend',
  });

  const handleStartSession = async () => {
    setIsGenerating(true);
    try {
      const brief = await generateUniqueProjectBrief(pendingSettings);
      setView({ type: 'new-chat', personaSettings: pendingSettings, initialBrief: brief });
    } catch {
      setView({
        type: 'new-chat',
        personaSettings: pendingSettings,
        initialBrief: 'Hey! I have a project I need help with. Can you build it for me?',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => setView({ type: 'home' });
  const handleGoHome = () => setView({ type: 'home' });
  const handleSessionCreated = () => setSidebarRefresh((n) => n + 1);
  const handleSelectSession = (session: StoredSession) => setView({ type: 'resume', session });
  const handleSignOut = async () => {
    setView({ type: 'home' });
    await signOut();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <HistorySidebar
        currentSessionId={view.type === 'resume' ? view.session.$id : null}
        isHome={view.type === 'home'}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onGoHome={handleGoHome}
        refreshTrigger={sidebarRefresh}
      />

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Main panel — no separate sign-out bar; it lives in the sidebar footer */}
        {view.type === 'home' && (
          <div className="flex-1 overflow-auto">
            <PersonaSelector
              onPersonaChange={setPendingSettings}
              onStartSession={handleStartSession}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {view.type === 'new-chat' && (
          <ChatInterface
            personaSettings={view.personaSettings}
            initialMessage={view.initialBrief}
            onSessionCreated={handleSessionCreated}
            onBack={handleNewChat}
          />
        )}

        {view.type === 'resume' && (
          <ChatInterface
            resumeSession={view.session}
            onSessionCreated={handleSessionCreated}
            onBack={handleNewChat}
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ProtectedRoute fallback={<AuthGate />}>
      <AppContent />
    </ProtectedRoute>
  );
}

export default App;

