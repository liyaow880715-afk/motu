"use client";

import { create } from "zustand";

export type KeyType = "PER_USE" | "DAILY" | "MONTHLY";

export interface KeyInfo {
  id: string;
  key: string;
  type: KeyType;
  label: string | null;
  usedCount: number;
  activatedAt: string | null;
  expiresAt: string | null;
}

interface AuthState {
  key: string | null;
  keyInfo: KeyInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  setKey: (key: string, info: KeyInfo) => void;
  clearKey: () => void;
  checkAuth: () => Promise<boolean>;
}

const STORAGE_KEY = "bm_access_key";

function loadStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveStoredKey(key: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  key: null,
  keyInfo: null,
  isLoading: true,
  isLoggedIn: false,

  setKey: (key, info) => {
    saveStoredKey(key);
    set({ key, keyInfo: info, isLoggedIn: true, isLoading: false });
  },

  clearKey: () => {
    saveStoredKey(null);
    set({ key: null, keyInfo: null, isLoggedIn: false, isLoading: false });
  },

  checkAuth: async () => {
    const storedKey = loadStoredKey();
    if (!storedKey) {
      set({ isLoading: false, isLoggedIn: false });
      return false;
    }

    try {
      const res = await fetch(`/api/auth/me?key=${encodeURIComponent(storedKey)}`);
      const data = await res.json();

      if (data.success) {
        set({ key: storedKey, keyInfo: data.data, isLoggedIn: true, isLoading: false });
        return true;
      } else {
        // Only clear on explicit auth failure (401/403), not network errors
        saveStoredKey(null);
        set({ key: null, keyInfo: null, isLoggedIn: false, isLoading: false });
        return false;
      }
    } catch {
      // Network/server error: keep existing login state, don't clear key
      set({ isLoading: false });
      return false;
    }
  },
}));
