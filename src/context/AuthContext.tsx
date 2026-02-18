import * as React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Models } from 'appwrite';
import { getCurrentUser, login, logout, createAccount } from '@/lib/appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session from cookie
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await login(email, password);
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    await createAccount(email, password, name);
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      // Always clear local state even if the API call fails
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
