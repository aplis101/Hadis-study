"use client";

import { useRef, useCallback, useState } from "react";

interface ProgressBarProps {
  value?: number;
  max?: number;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  thin?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ProgressBar({
  value,
  max,
  currentTime,
  duration,
  onSeek,
  thin = false,
  className = "",
}: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const resolvedDuration = duration ?? max ?? 0;
  const resolvedCurrent = currentTime ?? value ?? 0;

  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current || resolvedDuration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      return ratio * resolvedDuration;
    },
    [resolvedDuration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onSeek) return;
      setDragging(true);
      const newTime = getTimeFromPosition(e.clientX);
      onSeek(newTime);

      const handleMouseMove = (me: MouseEvent) => {
        const t = getTimeFromPosition(me.clientX);
        onSeek(t);
      };

      const handleMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [getTimeFromPosition, onSeek]
  );

  const progress = resolvedDuration > 0 ? (resolvedCurrent / resolvedDuration) * 100 : 0;

  if (thin) {
    return (
      <div
        ref={trackRef}
        className={`h-1 bg-stone-200 cursor-pointer relative group ${className}`}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="شريط التقدم"
        aria-valuemin={0}
        aria-valuemax={resolvedDuration}
        aria-valuenow={resolvedCurrent}
      >
        <div
          className="absolute top-0 end-0 h-full bg-emerald-700 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] text-stone-400 tabular-nums w-8 text-end" dir="ltr">
        {formatTime(resolvedCurrent)}
      </span>
      <div
        ref={trackRef}
        className="flex-1 h-1.5 bg-stone-200 rounded-full cursor-pointer relative group"
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="شريط التقدم"
        aria-valuemin={0}
        aria-valuemax={resolvedDuration}
        aria-valuenow={resolvedCurrent}
      >
        <div
          className={`absolute top-0 end-0 h-full bg-emerald-700 rounded-full transition-[width] ${
            dragging ? "" : "duration-100"
          }`}
          style={{ width: `${progress}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 size-3 bg-emerald-700 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity ${
            dragging ? "opacity-100" : ""
          }`}
          style={{
            insetInlineEnd: `${progress}%`,
            transform: `translateY(-50%) translateX(50%)`,
          }}
        />
      </div>
      <span className="text-[10px] text-stone-400 tabular-nums w-8 text-start" dir="ltr">
        {formatTime(resolvedDuration)}
      </span>
    </div>
  );
}

export { ProgressBar };
