import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ImageUploader } from '@/components/features/ImageUploader';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { sendStreamingChatMessage, imageToBase64, type OllamaMessage } from '@/lib/ollama';
import { generateSystemPrompt, type PersonaSettings } from '@/lib/prompts';
import { useAuth } from '@/context/AuthContext';
import { SessionWriter, loadSessionMessages, type ChatMessage } from '@/lib/chatService';
import type { StoredSession } from '@/lib/appwrite';

interface ChatInterfaceProps {
  personaSettings?: PersonaSettings;
  initialMessage?: string;
  resumeSession?: StoredSession;
  onSessionCreated?: () => void;
  onBack?: () => void;
}

export function ChatInterface({
  personaSettings,
  initialMessage,
  resumeSession,
  onSessionCreated,
  onBack,
}: ChatInterfaceProps) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<SessionWriter | null>(null);
  const sessionNotifiedRef = useRef(false);

  const activePersona: PersonaSettings = resumeSession
    ? JSON.parse(resumeSession.personaSettings)
    : personaSettings!;

  useEffect(() => {
    if (resumeSession) {
      setLoadingHistory(true);
      loadSessionMessages(resumeSession.$id)
        .then((msgs) => setMessages(msgs))
        .catch(console.error)
        .finally(() => setLoadingHistory(false));

      const writer = new SessionWriter(user!.$id, activePersona, resumeSession.title);
      writer.setExistingSession(resumeSession.$id, resumeSession.messageCount);
      writerRef.current = writer;
    } else {
      setMessages([
        {
          id: 'opening',
          role: 'assistant',
          content: initialMessage ?? '',
          timestamp: new Date(),
        },
      ]);
      writerRef.current = null;
      sessionNotifiedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSession?.$id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() && !selectedImage) return;

    const imageToSend = selectedImage;
    const blobUrl = imageToSend ? URL.createObjectURL(imageToSend) : undefined;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input || '(Screenshot attached)',
      timestamp: new Date(),
      imageUrl: blobUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setSelectedImage(null);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ]);

    let assistantContent = '';

    try {
      if (!writerRef.current) {
        const title = (initialMessage ?? input).slice(0, 120);
        writerRef.current = new SessionWriter(user!.$id, activePersona, title);
        // Save the opening AI brief as the first message in the session
        if (initialMessage) {
          writerRef.current.saveInitialBrief(initialMessage).catch(console.warn);
        }
      }

      const hasImage = !!imageToSend;
      const history = messages.filter((m) => m.id !== 'opening' || !!resumeSession);
      const ollamaMessages: OllamaMessage[] = [
        { role: 'system', content: generateSystemPrompt(activePersona, hasImage) },
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        {
          role: 'user',
          content: userMessage.content,
          images: imageToSend ? [await imageToBase64(imageToSend)] : undefined,
        },
      ];

      // --- Streaming (failure here replaces the message with an error) ---
      await sendStreamingChatMessage(ollamaMessages, (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg,
          ),
        );
      });

      // --- Persistence (failure here must NOT wipe the streamed content) ---
      try {
        const writer = writerRef.current!;
        // Save user message first, then assistant — serial to avoid session race
        const savedUser = await writer.save('user', userMessage.content, imageToSend);
        await writer.save('assistant', assistantContent);

        if (savedUser.storageFileId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === userMessage.id
                ? {
                    ...msg,
                    imageUrl: savedUser.imageUrl,
                    storageFileId: savedUser.storageFileId ?? undefined,
                  }
                : msg,
            ),
          );
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        }

        if (!sessionNotifiedRef.current && onSessionCreated) {
          sessionNotifiedRef.current = true;
          onSessionCreated();
        }
      } catch (saveError) {
        // Persistence failed — keep the streamed response visible
        console.warn('Failed to persist messages:', saveError instanceof Error ? saveError.message : saveError);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  " Sorry, I couldn't connect to the AI. Make sure Ollama is running on localhost:11434 with a vision model like llava or gemma3.",
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, messages, activePersona, initialMessage, resumeSession, user, onSessionCreated]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {resumeSession ? resumeSession.title : 'Client Chat'}
          </h2>
          <p className="text-xs text-gray-500">
            {activePersona.clarity} clarity  {activePersona.behavior} behavior
            {activePersona.role ? `  ${activePersona.role}` : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading messages</span>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                imageUrl={message.imageUrl}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
            <ImageUploader
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
              disabled={isLoading}
            />
            <div className="flex-1 flex flex-col">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message (Shift+Enter for new line)"
                disabled={isLoading || loadingHistory}
                className="resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-1 min-h-10 max-h-40"
                rows={1}
              />
            </div>
            <Button
              onClick={() => void handleSend()}
              disabled={isLoading || loadingHistory || (!input.trim() && !selectedImage)}
              size="sm"
              className="self-end mb-0.5 shrink-0"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
