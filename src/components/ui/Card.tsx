import type { CardShadow } from "@/types/shared";

interface CardProps {
  children: React.ReactNode;
  shadow?: CardShadow;
  border?: boolean;
  clickable?: boolean;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

const shadowStyles: Record<CardShadow, string> = {
  none: "shadow-none",
  soft: "shadow-sm",
  lifted: "shadow-md",
  overlay: "shadow-xl",
};

function Card({
  children,
  shadow = "soft",
  border = true,
  clickable = false,
  hover = false,
  className = "",
  onClick,
}: CardProps) {
  const Component = clickable ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white rounded-xl ${shadowStyles[shadow]}
        ${border ? "border border-stone-200" : ""}
        ${
          clickable || hover
            ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            : ""
        }
        ${clickable ? "text-start w-full" : ""}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

export { Card };
