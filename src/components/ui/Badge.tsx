import { BadgeCheck, Star } from "lucide-react";
import type { Grade, BadgeSize } from "@/types/shared";

interface BadgeProps {
  size?: BadgeSize;
  className?: string;
}

interface VerifiedBadgeProps extends BadgeProps {
  showIcon?: boolean;
}

const sizeStyles = {
  sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
  md: "text-xs px-2 py-1 gap-1",
  lg: "text-sm px-3 py-1.5 gap-1.5",
};

function VerifiedBadge({
  size = "md",
  showIcon = true,
  className = "",
}: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-emerald-700 font-medium ${sizeStyles[size]} ${className}`}
    >
      {showIcon && <BadgeCheck className="size-3.5" />}
      معتمد
    </span>
  );
}

function FavoriteBadge({
  size = "md",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-amber-600 ${sizeStyles[size]} ${className}`}
    >
      <Star className="size-3.5 fill-amber-600" />
    </span>
  );
}

function CommunityBestBadge({
  size = "md",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center bg-amber-100 text-amber-800 rounded-full font-medium ${sizeStyles[size]} ${className}`}
    >
      <Star className="size-3 fill-amber-600" />
      الأعلى تقييماً
    </span>
  );
}

const gradeConfig: Record<Grade, { label: string; bg: string; text: string }> =
  {
    sahih: {
      label: "صحيح",
      bg: "bg-green-100",
      text: "text-green-700",
    },
    hasan: {
      label: "حسن",
      bg: "bg-yellow-100",
      text: "text-yellow-700",
    },
    daif: {
      label: "ضعيف",
      bg: "bg-red-100",
      text: "text-red-700",
    },
  };

interface GradeBadgeProps extends BadgeProps {
  grade: Grade;
}

function GradeBadge({
  grade,
  size = "md",
  className = "",
}: GradeBadgeProps) {
  const config = gradeConfig[grade];
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md ${config.bg} ${config.text} ${sizeStyles[size]} ${className}`}
    >
      {config.label}
    </span>
  );
}

type BadgeVariant = Grade | "community" | "verified" | "default";

interface BadgeComponentProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeComponentProps) {
  if (variant === "community") {
    return (
      <span
        className={`inline-flex items-center bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      >
        {children}
      </span>
    );
  }

  if (variant === "verified") {
    return (
      <span
        className={`inline-flex items-center text-emerald-700 font-medium px-2 py-0.5 text-xs ${className}`}
      >
        {children}
      </span>
    );
  }

  if (variant === "sahih" || variant === "hasan" || variant === "daif") {
    const config = gradeConfig[variant];
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-md px-2 py-0.5 text-xs ${config.bg} ${config.text} ${className}`}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-stone-100 text-stone-600 ${className}`}
    >
      {children}
    </span>
  );
}

export { Badge, VerifiedBadge, FavoriteBadge, CommunityBestBadge, GradeBadge };
