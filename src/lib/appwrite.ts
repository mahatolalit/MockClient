import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
export const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID || '';
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID || '';

// Auth helpers
export const createAccount = async (email: string, password: string, name: string) => {
  return await account.create('unique()', email, password, name);
};

export const login = async (email: string, password: string) => {
  return await account.createEmailPasswordSession(email, password);
};

export const logout = async () => {
  return await account.deleteSession('current');
};

export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch {
    return null;
  }
};

// Database helpers
export const saveChatHistory = async (userId: string, messages: unknown[], personaSettings: unknown) => {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTION_ID,
    'unique()',
    {
      userId,
      messages: JSON.stringify(messages),
      personaSettings: JSON.stringify(personaSettings),
      createdAt: new Date().toISOString(),
    }
  );
};

export const getChatHistory = async () => {
  return await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_ID,
    [
      // Add query filters if needed
    ]
  );
};

// Storage helpers
export const uploadScreenshot = async (file: File) => {
  return await storage.createFile(BUCKET_ID, 'unique()', file);
};

export const getFileUrl = (fileId: string) => {
  return storage.getFileView(BUCKET_ID, fileId);
};

export const deleteFile = async (fileId: string) => {
  return await storage.deleteFile(BUCKET_ID, fileId);
};
