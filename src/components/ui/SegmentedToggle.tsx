"use client";

interface SegmentedToggleOption {
  value: string;
  label: string;
}

interface SegmentedToggleProps {
  options: SegmentedToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function SegmentedToggle({
  options,
  value,
  onChange,
  className = "",
}: SegmentedToggleProps) {
  return (
    <div
      className={`inline-flex bg-stone-100 rounded-lg p-0.5 ${className}`}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={`
              px-3 py-1.5 text-sm rounded-md font-medium transition-all duration-150
              ${isActive ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedToggle };
