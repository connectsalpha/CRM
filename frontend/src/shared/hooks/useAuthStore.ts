import { create } from 'zustand';
import api from '../services/api.js';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  employeeId?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user } = response.data;
      set({ user, isAuthenticated: true, isLoading: false, isCheckingAuth: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Login failed',
        isLoading: false,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      throw err;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    }
    set({ user: null, isAuthenticated: false, isLoading: false, isCheckingAuth: false });
  },
  checkAuth: async () => {
    try {
      const response = await api.get('/auth/me');
      set((state) => {
        if (state.isAuthenticated) return { isCheckingAuth: false };
        return { user: response.data, isAuthenticated: true, isLoading: false, isCheckingAuth: false };
      });
    } catch (err) {
      set((state) => {
        if (state.isAuthenticated) return { isCheckingAuth: false };
        return { user: null, isAuthenticated: false, isLoading: false, isCheckingAuth: false };
      });
    }
  },
}));
