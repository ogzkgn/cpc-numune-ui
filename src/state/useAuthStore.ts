import { create } from "zustand";

import { useAppStore } from "./useAppStore";
import type { UserRole } from "./useAppStore";
import { queryClient } from "../lib/queryClient";

type AuthUser = {
  email: string;
  role: UserRole;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error?: string;
  authReady: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
};

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: undefined,
  authReady: false,

  setUser: (user) => set({ user }),

  clearSession: () => {
    try {
      const reset = useAppStore.getState().resetState;
      reset?.();
    } catch (_err) {
      // ignore
    }
    queryClient.clear();
    set({ user: null, loading: false, error: undefined, authReady: true });
  },

  bootstrap: async () => {
    if (get().loading || get().authReady) return;
    set({ loading: true, error: undefined });
    try {
      const response = await fetch(`${baseUrl}/auth/me`, { credentials: "include" });
      if (!response.ok) {
        set({ loading: false, authReady: true });
        const addToast = useAppStore.getState().addToast;
        addToast?.({
          title: "Oturum doğrulanamadı",
          description: "Lütfen yeniden giriş yapın.",
          variant: "error"
        });
        return;
      }
      const data = await response.json();
      set({ user: { email: data.email, role: data.role }, loading: false, authReady: true });
    } catch (error) {
      set({ loading: false, authReady: true, error: "Oturum doğrulanamadı" });
      const addToast = useAppStore.getState().addToast;
      addToast?.({
        title: "Bağlantı hatası",
        description: "Oturum kontrolü başarısız. Lütfen tekrar deneyin.",
        variant: "error"
      });
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
        set({
          loading: false,
          authReady: true,
          error: "E-posta veya şifre hatalı."
        });
        const addToast = useAppStore.getState().addToast;
        addToast?.({
          title: "Giriş başarısız",
          description: "E-posta veya şifre hatalı.",
          variant: "error"
        });
        return;
      }
      const data = await response.json();
      get().clearSession();
      set({ user: { email: data.email, role: data.role }, loading: false, error: undefined, authReady: true });
    } catch (error) {
      const addToast = useAppStore.getState().addToast;
      const message = "Bağlantı hatası. Lütfen tekrar deneyin.";
      addToast?.({
        title: "Giriş başarısız",
        description: message,
        variant: "error"
      });
      set({
        loading: false,
        authReady: true,
        error: message
      });
      // Do not rethrow to avoid noisy console errors
    }
  },

  logout: async () => {
    try {
      await fetch(`${baseUrl}/auth/logout`, { method: "POST", credentials: "include" });
    } catch (error) {
      const addToast = useAppStore.getState().addToast;
      addToast?.({
        title: "Çıkış yapılamadı",
        description: "Lütfen tekrar deneyin.",
        variant: "error"
      });
    } finally {
      get().clearSession();
    }
  }
}));
