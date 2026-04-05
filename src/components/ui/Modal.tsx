"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Modal({ open, onClose, children, size = "md", className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={ref}
        className={cn(
          "relative z-10 bg-white dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-black/50",
          size === "sm" && "w-full max-w-sm",
          size === "md" && "w-full max-w-md",
          size === "lg" && "w-full max-w-2xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
