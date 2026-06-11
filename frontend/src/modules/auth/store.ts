import { create } from 'zustand';
import { fetchSession, logoutSession } from '@/lib/auth-session';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'ENSEIGNANT' | 'PARENT';
  nom?: string;
  prenom?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrateFromSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Email ou mot de passe incorrect");
      const session = await fetchSession(true);
      if (!session.authenticated) throw new Error('Session invalide');
      set({
        user: {
          id: session.userId,
          email: session.email,
          role: session.role as User['role'],
        },
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur de connexion';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await logoutSession();
    set({ user: null });
  },

  hydrateFromSession: async () => {
    const session = await fetchSession();
    if (!session.authenticated) {
      set({ user: null });
      return;
    }
    set({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role as User['role'],
      },
    });
  },
}));
