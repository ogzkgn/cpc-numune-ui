import { create } from "zustand";

import { useAppStore } from "./useAppStore";
import type { UserRole } from "./useAppStore";

type AuthUser = {
  email: string;
  role: UserRole;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error?: string;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: undefined,

  setUser: (user) => set({ user }),

  bootstrap: async () => {
    if (get().loading || get().user) return;
    set({ loading: true, error: undefined });
    try {
      const response = await fetch(`${baseUrl}/auth/me`, { credentials: "include" });
      if (!response.ok) {
        set({ user: null, loading: false });
        return;
      }
      const data = await response.json();
      set({ user: { email: data.email, role: data.role }, loading: false });
    } catch (error) {
      console.error("Auth bootstrap failed", error);
      set({ user: null, loading: false, error: "Oturum doğrulanamadı" });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: undefined });
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        let message = "Giriş başarısız";
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch (_err) {
          // ignore
        }
        throw new Error(message);
      }
      const data = await response.json();
      set({ user: { email: data.email, role: data.role }, loading: false, error: undefined });
    } catch (error) {
      console.error("Login failed", error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Giriş başarısız"
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await fetch(`${baseUrl}/auth/logout`, { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      try {
        const reset = useAppStore.getState().resetState;
        reset?.();
      } catch (_err) {
        // ignore
      }
      set({ user: null, error: undefined });
    }
  }
}));
