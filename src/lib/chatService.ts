/**
 * chatService.ts
 *
 * Thin stateful wrapper around the Appwrite helpers used by ChatInterface.
 * Keeps session creation, message persistence, and image uploads decoupled
 * from the UI component.
 */

import {
  createSession,
  touchSession,
  appendMessage,
  fetchMessages,
  downloadImageAsObjectUrl,
  type StoredMessage,
} from './appwrite';
import type { PersonaSettings } from './prompts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;       // ephemeral blob URL or persistent storage URL
  storageFileId?: string;  // set when the image is stored in Appwrite
}

/**
 * Converts a StoredMessage into the ChatMessage shape used by the UI,
 * resolving storageFileId → imageUrl.
 */
export function hydrateMessage(msg: StoredMessage): ChatMessage {
  return {
    id: msg.$id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    storageFileId: msg.storageFileId ?? undefined,
    // imageUrl is resolved to a blob URL separately in loadSessionMessages
  };
}

/**
 * Load all messages for a session (handles pagination automatically).
 * Stops after 500 messages to prevent UI from locking up on very old sessions.
 * Images are fetched via the SDK auth session and resolved to blob URLs.
 */
export async function loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const all: StoredMessage[] = [];
  let cursor: string | undefined;
  const MAX_MESSAGES = 500;

  do {
    const batch = await fetchMessages(sessionId, 50, cursor);
    all.push(...batch);
    cursor = batch.length === 50 ? batch[batch.length - 1].$id : undefined;
  } while (cursor && all.length < MAX_MESSAGES);

  const messages = all.map(hydrateMessage);

  // Resolve storage images → blob URLs in parallel so <img> tags work without auth cookies
  await Promise.all(
    messages
      .filter((m) => m.storageFileId)
      .map(async (m) => {
        m.imageUrl = await downloadImageAsObjectUrl(m.storageFileId!);
      }),
  );

  return messages;
}

// ---------------------------------------------------------------------------
// Per-session write helper (used inside ChatInterface)
// ---------------------------------------------------------------------------

export class SessionWriter {
  private sessionId: string | null = null;
  private sessionCreating: Promise<string> | null = null; // lock
  private messageCount = 0;
  private userId: string;
  private personaSettings: PersonaSettings;
  private title: string;

  constructor(userId: string, personaSettings: PersonaSettings, title: string) {
    this.userId = userId;
    this.personaSettings = personaSettings;
    this.title = title;
  }

  /** Call this when resuming an existing session so ensureSession() skips creation. */
  setExistingSession(sessionId: string, messageCount: number) {
    this.sessionId = sessionId;
    this.messageCount = messageCount;
  }

  /** Lazily creates the session document on the first message.
   *  Uses a lock so concurrent calls never create two sessions. */
  private async ensureSession(): Promise<string> {
    if (this.sessionId) return this.sessionId;
    if (!this.sessionCreating) {
      this.sessionCreating = createSession(this.userId, this.title, this.personaSettings)
        .then((s) => {
          this.sessionId = s.$id;
          return s.$id;
        });
    }
    return this.sessionCreating;
  }

  /**
   * Saves the initial AI brief as the very first message in the session.
   * Call this once right after constructing the writer for a new session.
   */
  async saveInitialBrief(content: string): Promise<void> {
    const sessionId = await this.ensureSession();
    await appendMessage(sessionId, 'assistant', content, null, this.userId);
    this.messageCount++;
    touchSession(sessionId, this.messageCount).catch(console.warn);
  }

  /**
   * Persists a message. If imageFile is provided it is uploaded to Storage
   * and the file ID is attached. Returns the final ChatMessage (with
   * storageFileId + imageUrl resolved).
   */
  async save(
    role: 'user' | 'assistant',
    content: string,
    imageFile?: File | null,
  ): Promise<{ storageFileId: string | null; imageUrl: string | undefined }> {
    const sessionId = await this.ensureSession();
    const stored = await appendMessage(sessionId, role, content, imageFile, this.userId);
    this.messageCount++;
    // Fire-and-forget touch — we don't await to avoid blocking the UI
    touchSession(sessionId, this.messageCount).catch(console.warn);

    return {
      storageFileId: stored.storageFileId,
      imageUrl: stored.storageFileId ? await downloadImageAsObjectUrl(stored.storageFileId) : undefined,
    };
  }

  getSessionId() {
    return this.sessionId;
  }
}
