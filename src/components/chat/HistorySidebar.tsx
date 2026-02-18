import { useState, useEffect, useCallback } from 'react';
import { listSessions, deleteSession, type StoredSession } from '@/lib/appwrite';
import { useAuth } from '@/context/AuthContext';

interface HistorySidebarProps {
  currentSessionId: string | null;
  isHome: boolean;
  onSelectSession: (session: StoredSession) => void;
  onNewChat: () => void;
  onGoHome: () => void;
  refreshTrigger: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function HistorySidebar({
  currentSessionId,
  isHome,
  onSelectSession,
  onNewChat,
  onGoHome,
  refreshTrigger,
}: HistorySidebarProps) {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listSessions(user.$id);
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this chat? This cannot be undone.')) return;
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.$id !== sessionId));
      if (currentSessionId === sessionId) onGoHome();
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-full">
      {/* Logo / Home */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-gray-800 transition-colors group"
        >
          <span className="text-base font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
            MockClient
          </span>
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isHome
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="mx-3 mb-2 border-t border-gray-700" />

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-gray-500 text-center mt-8 px-4">No chats yet. Start one!</p>
        ) : (
          sessions.map((session) => {
            const isActive = session.$id === currentSessionId;
            const persona = (() => {
              try {
                const p = JSON.parse(session.personaSettings) as Record<string, string>;
                return `${p.clarity} · ${p.behavior}`;
              } catch {
                return '';
              }
            })();
            return (
              <div
                key={session.$id}
                onClick={() => !isActive && onSelectSession(session)}
                className={`group relative mx-2 my-0.5 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-gray-700 cursor-default'
                    : 'hover:bg-gray-800 cursor-pointer'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r" />
                )}
                {/* Title */}
                <p className="text-sm text-gray-100 truncate pr-6 leading-snug">
                  {session.title}
                </p>
                {/* Meta row */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-500 truncate">{persona}</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500 shrink-0">{timeAgo(session.lastMessageAt)}</span>
                </div>
                {/* Message count badge */}
                {session.messageCount > 0 && (
                  <span className="absolute right-8 top-2.5 text-xs text-gray-600">
                    {session.messageCount}
                  </span>
                )}
                {/* Delete button */}
                <button
                  onClick={(e) => void handleDelete(e, session.$id)}
                  disabled={deletingId === session.$id}
                  title="Delete chat"
                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-500 hover:text-red-400"
                >
                  {deletingId === session.$id ? (
                    <div className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: user + sign out */}
      <div className="border-t border-gray-700 px-4 py-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-300 truncate font-medium">{user?.name || user?.email}</p>
          <p className="text-xs text-gray-500 truncate">{user?.name ? user.email : ''}</p>
        </div>
        <button
          onClick={() => void signOut()}
          title="Sign out"
          className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
