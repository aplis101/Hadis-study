import { Mic, Search, BookOpen, Star, ShieldCheck } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const predefinedIcons: Record<string, React.ReactNode> = {
  recordings: <Mic className="size-12 text-stone-300" />,
  search: <Search className="size-12 text-stone-300" />,
  content: <BookOpen className="size-12 text-stone-300" />,
  favorite: <Star className="size-12 text-stone-300" />,
  clear: <ShieldCheck className="size-12 text-stone-300" />,
};

const predefinedMessages: Record<string, { icon: string; title: string; description?: string }> = {
  "no-content": {
    icon: "content",
    title: "لا يوجد محتوى في هذا الباب بعد",
  },
  "no-recordings": {
    icon: "recordings",
    title: "لا تسجيلات بعد",
    description: "كن أول من يسجّل هذا الحديث",
  },
  "no-favorites": {
    icon: "favorite",
    title: "لم تفضّل أي تسجيل بعد",
    description: "ضع ⭐ على قارئك المفضّل",
  },
  "no-reports": {
    icon: "clear",
    title: "لا توجد بلاغات — كل شيء تحت السيطرة ✅",
  },
  search: {
    icon: "search",
    title: "لا توجد نتائج للبحث",
  },
};

interface PredefinedEmptyStateProps {
  type: keyof typeof predefinedMessages;
  action?: React.ReactNode;
  className?: string;
}

function PredefinedEmptyState({
  type,
  action,
  className = "",
}: PredefinedEmptyStateProps) {
  const config = predefinedMessages[type];
  return (
    <EmptyState
      icon={predefinedIcons[config.icon]}
      title={config.title}
      description={config.description}
      action={action}
      className={className}
    />
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      {icon && <div className="mb-4">{icon}</div>}
      {title && (
        <p className="text-stone-500 text-sm max-w-xs leading-relaxed">
          {title}
        </p>
      )}
      {description && (
        <p className="text-stone-400 text-xs mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState, PredefinedEmptyState };
