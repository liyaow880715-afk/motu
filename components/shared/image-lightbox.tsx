"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [src, onClose]);

  useEffect(() => {
    setScale(1);
  }, [src]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(0.5, s - 0.25)); }}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/20"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3ch] text-center text-sm">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(3, s + 0.25)); }}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/20"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
