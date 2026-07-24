"use client";

interface FilterTab {
  value: string;
  label: string;
}

interface FilterTabsProps {
  tabs?: FilterTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const defaultTabs: FilterTab[] = [
  { value: "top-rated", label: "الأعلى تقييماً" },
  { value: "most-listened", label: "الأكثر استماعاً" },
  { value: "newest", label: "الأحدث" },
  { value: "my-favorites", label: "المفضّلة لدي" },
];

function FilterTabs({
  tabs = defaultTabs,
  value,
  onChange,
  className = "",
}: FilterTabsProps) {
  return (
    <div
      className={`flex gap-0.5 bg-stone-100 rounded-lg p-0.5 mx-4 my-2 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`
              flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-150 text-nowrap
              ${
                isActive
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { FilterTabs };
