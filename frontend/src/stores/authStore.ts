import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import Cookies from 'js-cookie';

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => {
        set({ user: null });
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.clear();
      },
    }),
    { name: 'auth-store', partialize: (state) => ({ user: state.user }) }
  )
);
