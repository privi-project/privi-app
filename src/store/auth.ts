import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface AuthStore {
  session: Session | null;
  user: any | null;
  loading: boolean;
  isFirstLaunch: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  setFirstLaunch: (isFirstLaunch: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  loading: true,
  isFirstLaunch: false,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setFirstLaunch: (isFirstLaunch) => set({ isFirstLaunch }),

  logout: () => set({ session: null, user: null }),
}));
