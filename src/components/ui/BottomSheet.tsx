"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  filterTabs?: React.ReactNode;
  actionButton?: React.ReactNode;
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
  filterTabs,
  actionButton,
}: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const close = useCallback(() => {
    setAnimating(false);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 250);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      document.body.style.overflow = "hidden";
    } else {
      close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, close]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-250 ${
          animating ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
      />
      <div
        className={`absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-xl flex flex-col transition-transform duration-250 ease-out ${
          animating ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
          <div
            className="w-10 h-1 rounded-full bg-stone-300 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              const startY = e.clientY;
              const handleMouseMove = (me: MouseEvent) => {
                if (me.clientY - startY > 100) close();
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", handleMouseMove);
              });
            }}
          />
        </div>

        {title && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 shrink-0">
            <h2 className="text-base font-bold text-stone-900">{title}</h2>
            <button
              onClick={close}
              className="p-1 rounded-full hover:bg-stone-100"
              aria-label="إغلاق"
            >
              <X className="size-5 text-stone-500" />
            </button>
          </div>
        )}

        {filterTabs && (
          <div className="shrink-0">{filterTabs}</div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {children}
        </div>

        {actionButton && (
          <div className="px-4 py-3 border-t border-stone-100 shrink-0">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
}

export { BottomSheet };
export default BottomSheet;
