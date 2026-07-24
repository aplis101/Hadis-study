"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  activeColor?: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      active = false,
      activeColor,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const activeStyle = active && activeColor ? activeColor : "";

    return (
      <button
        ref={ref}
        aria-label={label}
        className={`
          inline-flex items-center justify-center rounded-full
          size-11
          hover:bg-stone-100 active:bg-stone-200 active:scale-95
          transition-all duration-150
          text-stone-500
          ${activeStyle}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
export default IconButton;
export { IconButton };
