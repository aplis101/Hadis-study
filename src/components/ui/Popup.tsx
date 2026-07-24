"use client";

import { useEffect, useRef } from "react";
import { X, Volume2 } from "lucide-react";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  audioUrl?: string;
  onPlayAudio?: () => void;
}

function Popup({
  open,
  onClose,
  children,
  audioUrl,
  onPlayAudio,
}: PopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-12">
      <div
        ref={popupRef}
        className="relative pointer-events-auto bg-white rounded-xl shadow-xl border border-stone-200 max-w-xs w-full"
      >
        <div className="absolute -top-1.5 start-1/2 -translate-x-1/2 size-3 rotate-45 bg-white border-t border-s border-stone-200" />

        <button
          onClick={onClose}
          className="absolute top-2 end-2 p-0.5 rounded-full hover:bg-stone-100"
          aria-label="إغلاق"
        >
          <X className="size-4 text-stone-400" />
        </button>

        <div className="px-4 py-3 pt-8">{children}</div>

        {audioUrl && onPlayAudio && (
          <div className="px-4 pb-3">
            <button
              onClick={onPlayAudio}
              className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800"
              aria-label="استماع إلى النطق"
            >
              <Volume2 className="size-3.5" />
              النطق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { Popup };
export default Popup;
