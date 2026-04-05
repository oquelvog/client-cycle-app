import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3.5 py-2 text-sm",
        variant === "primary" && "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
        variant === "secondary" && "bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-400",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
        variant === "ghost" && "text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
