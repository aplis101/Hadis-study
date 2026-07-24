"use client";

import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";
import type { ButtonVariant, ButtonSize } from "@/types/shared";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-stone-300 disabled:text-stone-500",
  secondary:
    "bg-stone-200 text-stone-800 hover:bg-stone-300 active:bg-stone-400 disabled:opacity-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50",
  ghost:
    "text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-50",
  icon: "p-2 rounded-full hover:bg-stone-100 active:bg-stone-200 disabled:opacity-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-base rounded-lg",
  lg: "px-7 py-3 text-lg rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-150
          active:scale-95
          focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2
          ${variantStyles[variant]}
          ${variant !== "icon" ? sizeStyles[size] : "size-11 rounded-full"}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          iconLeft && <span className="inline-flex">{iconLeft}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && (
          <span className="inline-flex">{iconRight}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
