"use client";

import { create } from "zustand";

interface BrandState {
  brandName: string;
  companyName: string;
  version: string;
  setBrandName: (name: string) => void;
  setCompanyName: (name: string) => void;
  setVersion: (version: string) => void;
}

const STORAGE_KEY = "bm_brand_config";

function loadStoredBrand(): { brandName: string; companyName: string; version: string } {
  if (typeof window === "undefined") {
    return { brandName: "摹图", companyName: "零禾（上海）网络科技有限公司", version: "V1" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        brandName: parsed.brandName || "摹图",
        companyName: parsed.companyName || "零禾（上海）网络科技有限公司",
        version: parsed.version || "V1",
      };
    }
  } catch {
    // ignore
  }
  return { brandName: "摹图", companyName: "零禾（上海）网络科技有限公司", version: "V1" };
}

function saveStoredBrand(state: { brandName: string; companyName: string; version: string }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const useBrandStore = create<BrandState>((set) => {
  const initial = loadStoredBrand();
  return {
    ...initial,
    setBrandName: (brandName) => {
      set((state) => {
        const next = { ...state, brandName };
        saveStoredBrand(next);
        return next;
      });
    },
    setCompanyName: (companyName) => {
      set((state) => {
        const next = { ...state, companyName };
        saveStoredBrand(next);
        return next;
      });
    },
    setVersion: (version) => {
      set((state) => {
        const next = { ...state, version };
        saveStoredBrand(next);
        return next;
      });
    },
  };
});
