import { Client, Account, Databases, Storage, ID, Query, Permission, Role } from 'appwrite';
import type { PersonaSettings } from './prompts';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
/** Collection storing one document per chat session */
export const SESSIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SESSIONS_COLLECTION_ID || '';
/** Collection storing one document per message */
export const MESSAGES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID || '';
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID || '';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Silently kill any active session so a fresh one can be created. */
const clearActiveSession = async () => {
  try {
    await account.deleteSession('current');
  } catch {
    // no active session — that's fine
  }
};

export const createAccount = async (email: string, password: string, name: string) => {
  await clearActiveSession();
  await account.create(ID.unique(), email, password, name);
  return await account.createEmailPasswordSession(email, password);
};

export const login = async (email: string, password: string) => {
  await clearActiveSession();
  return await account.createEmailPasswordSession(email, password);
};

export const logout = async () => {
  try {
    await account.deleteSession('current');
  } catch {
    // session may already be expired — treat as success
  }
};

export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch {
    return null;
  }
};

export const updateName = async (name: string) => {
  return await account.updateName(name);
};

export const sendPasswordRecovery = async (email: string, redirectUrl: string) => {
  return await account.createRecovery(email, redirectUrl);
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredSession {
  $id: string;
  userId: string;
  title: string;
  personaSettings: string; // JSON
  messageCount: number;
  lastMessageAt: string;   // ISO
  createdAt: string;       // ISO
}

export interface StoredMessage {
  $id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  storageFileId: string | null; // Appwrite storage file ID for attached image
  timestamp: string;            // ISO
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * Create a new session document. Called once when user sends the first message.
 */
export const createSession = async (
  userId: string,
  title: string,
  personaSettings: PersonaSettings,
): Promise<StoredSession> => {
  const now = new Date().toISOString();
  return await databases.createDocument(
    DATABASE_ID,
    SESSIONS_COLLECTION_ID,
    ID.unique(),
    {
      userId,
      title: title.slice(0, 120),
      personaSettings: JSON.stringify(personaSettings),
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
    },
  ) as unknown as StoredSession;
};

/**
 * Increment messageCount and update lastMessageAt on a session.
 * Avoids re-writing the whole document on every message.
 */
export const touchSession = async (sessionId: string, newCount: number) => {
  return await databases.updateDocument(
    DATABASE_ID,
    SESSIONS_COLLECTION_ID,
    sessionId,
    {
      messageCount: newCount,
      lastMessageAt: new Date().toISOString(),
    },
  );
};

/**
 * List sessions for a user, newest first, capped at `limit`.
 */
export const listSessions = async (userId: string, limit = 30): Promise<StoredSession[]> => {
  const res = await databases.listDocuments(
    DATABASE_ID,
    SESSIONS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.orderDesc('lastMessageAt'),
      Query.limit(limit),
    ],
  );
  return res.documents as unknown as StoredSession[];
};

/**
 * Delete a session and all its messages + images.
 * Runs message deletion in batches to avoid hammering the DB.
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  // Fetch all message docs in batches (no Query.select — not supported in all SDK versions)
  let cursor: string | undefined;
  const fileIds: string[] = [];
  const msgIds: string[] = [];

  do {
    const queries: string[] = [
      Query.equal('sessionId', sessionId),
      Query.limit(100),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, queries);
    for (const doc of res.documents) {
      msgIds.push(doc.$id);
      if (doc['storageFileId']) fileIds.push(doc['storageFileId'] as string);
    }
    cursor = res.documents.length === 100 ? res.documents[res.documents.length - 1].$id : undefined;
  } while (cursor);

  // Delete messages (swallow individual failures so one bad doc doesn't block the rest)
  await Promise.all(msgIds.map((id) =>
    databases.deleteDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, id).catch(console.warn),
  ));
  // Delete storage files (best-effort)
  await Promise.all(fileIds.map((id) =>
    storage.deleteFile(BUCKET_ID, id).catch(() => null),
  ));
  // Delete session doc
  await databases.deleteDocument(DATABASE_ID, SESSIONS_COLLECTION_ID, sessionId);
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Append a single message to a session. Optionally uploads an image file first.
 * Returns the stored message document.
 */
export const appendMessage = async (
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  imageFile?: File | null,
  userId?: string,
): Promise<StoredMessage> => {
  let storageFileId: string | null = null;

  if (imageFile) {
    const perms = userId
      ? [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      : undefined;
    const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), imageFile, perms);
    storageFileId = uploaded.$id;
  }

  return await databases.createDocument(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    ID.unique(),
    {
      sessionId,
      role,
      content,
      storageFileId,
      timestamp: new Date().toISOString(),
    },
  ) as unknown as StoredMessage;
};

/**
 * Fetch messages for a session with cursor-based pagination.
 * Returns messages ordered oldest-first, up to `limit` starting after `cursor`.
 */
export const fetchMessages = async (
  sessionId: string,
  limit = 50,
  cursor?: string,
): Promise<StoredMessage[]> => {
  const queries = [
    Query.equal('sessionId', sessionId),
    Query.orderAsc('timestamp'),
    Query.limit(limit),
  ];
  if (cursor) queries.push(Query.cursorAfter(cursor));

  const res = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, queries);
  return res.documents as unknown as StoredMessage[];
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * Returns a direct view URL for a stored image file.
 * NOTE: This URL requires the browser to have an active Appwrite session cookie.
 * Use downloadImageAsObjectUrl() for reliable display in <img> tags across origins.
 */
export const getImageUrl = (fileId: string): string => {
  return storage.getFileView(BUCKET_ID, fileId).toString();
};

/**
 * Fetches an image file via the SDK auth session and returns a local blob URL.
 * This works regardless of CORS / cookie restrictions on <img> tags.
 * The caller is responsible for revoking the returned URL when done.
 */
export const downloadImageAsObjectUrl = async (fileId: string): Promise<string | undefined> => {
  try {
    const url = storage.getFileView(BUCKET_ID, fileId).toString();

    // Appwrite requires the project header on every request.
    // In cross-origin / localhost scenarios the SDK stores the session in
    // localStorage under 'cookieFallback' and sends it via X-Fallback-Cookies
    // — a plain fetch with only credentials:include misses this, causing 401s
    // after a page refresh when the cookie is not present in the jar.
    const headers: Record<string, string> = {
      'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID || '',
    };
    try {
      const fallback = localStorage.getItem('cookieFallback');
      if (fallback) headers['X-Fallback-Cookies'] = fallback;
    } catch { /* localStorage unavailable — proceed without fallback */ }

    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return undefined;
  }
};
